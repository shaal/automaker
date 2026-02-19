/**
 * Event Recency Hook
 *
 * Tracks the timestamp of the last WebSocket event received.
 * Used to conditionally disable polling when events are flowing
 * through WebSocket (indicating the connection is healthy).
 */

import { useCallback } from 'react';
import { create } from 'zustand';

/**
 * Time threshold (ms) to consider events as "recent"
 * If an event was received within this time, WebSocket is considered healthy
 * and polling can be safely disabled.
 */
export const EVENT_RECENCY_THRESHOLD = 5000; // 5 seconds

/**
 * Store for tracking event timestamps per query key
 * This allows fine-grained control over which queries have received recent events
 */
interface EventRecencyState {
  /** Map of query key (stringified) -> last event timestamp */
  eventTimestamps: Record<string, number>;
  /** Global last event timestamp (for any event) */
  lastGlobalEventTimestamp: number;
  /** Record an event for a specific query key */
  recordEvent: (queryKey: string) => void;
  /** Record a global event (useful for general WebSocket health) */
  recordGlobalEvent: () => void;
  /** Check if events are recent for a specific query key */
  areEventsRecent: (queryKey: string) => boolean;
  /** Check if any global events are recent */
  areGlobalEventsRecent: () => boolean;
}

export const useEventRecencyStore = create<EventRecencyState>((set, get) => ({
  eventTimestamps: {},
  lastGlobalEventTimestamp: 0,

  recordEvent: (queryKey: string) => {
    const now = Date.now();
    set((state) => ({
      eventTimestamps: {
        ...state.eventTimestamps,
        [queryKey]: now,
      },
      lastGlobalEventTimestamp: now,
    }));
  },

  recordGlobalEvent: () => {
    set({ lastGlobalEventTimestamp: Date.now() });
  },

  areEventsRecent: (queryKey: string) => {
    const { eventTimestamps } = get();
    const lastEventTime = eventTimestamps[queryKey];
    if (!lastEventTime) return false;
    return Date.now() - lastEventTime < EVENT_RECENCY_THRESHOLD;
  },

  areGlobalEventsRecent: () => {
    const { lastGlobalEventTimestamp } = get();
    if (!lastGlobalEventTimestamp) return false;
    return Date.now() - lastGlobalEventTimestamp < EVENT_RECENCY_THRESHOLD;
  },
}));

/**
 * Hook to record event timestamps when WebSocket events are received.
 * Should be called from WebSocket event handlers.
 *
 * @returns Functions to record events
 *
 * @example
 * ```tsx
 * const { recordEvent, recordGlobalEvent } = useEventRecorder();
 *
 * // In WebSocket event handler:
 * api.autoMode.onEvent((event) => {
 *   recordGlobalEvent();
 *   if (event.featureId) {
 *     recordEvent(`features:${event.featureId}`);
 *   }
 * });
 * ```
 */
export function useEventRecorder() {
  const recordEvent = useEventRecencyStore((state) => state.recordEvent);
  const recordGlobalEvent = useEventRecencyStore((state) => state.recordGlobalEvent);

  return { recordEvent, recordGlobalEvent };
}

/**
 * Hook to check if WebSocket events are recent, used by queries
 * to decide whether to enable/disable polling.
 *
 * @param queryKey - Optional specific query key to check
 * @returns Object with recency check result and timestamp
 *
 * @example
 * ```tsx
 * const { areEventsRecent, areGlobalEventsRecent } = useEventRecency();
 *
 * // In query options:
 * refetchInterval: areGlobalEventsRecent() ? false : 5000,
 * ```
 */
export function useEventRecency(queryKey?: string) {
  const areEventsRecent = useEventRecencyStore((state) => state.areEventsRecent);
  const areGlobalEventsRecent = useEventRecencyStore((state) => state.areGlobalEventsRecent);
  const lastGlobalEventTimestamp = useEventRecencyStore((state) => state.lastGlobalEventTimestamp);

  const checkRecency = useCallback(
    (key?: string) => {
      if (key) {
        return areEventsRecent(key);
      }
      return areGlobalEventsRecent();
    },
    [areEventsRecent, areGlobalEventsRecent]
  );

  return {
    areEventsRecent: queryKey ? () => areEventsRecent(queryKey) : areEventsRecent,
    areGlobalEventsRecent,
    checkRecency,
    lastGlobalEventTimestamp,
  };
}

/**
 * Utility function to create a refetchInterval that respects event recency.
 * Returns false (no polling) if events are recent, otherwise returns the interval.
 *
 * @param defaultInterval - The polling interval to use when events aren't recent
 * @returns A function suitable for React Query's refetchInterval option
 *
 * @example
 * ```tsx
 * const { data } = useQuery({
 *   queryKey: ['features'],
 *   queryFn: fetchFeatures,
 *   refetchInterval: createSmartPollingInterval(5000),
 * });
 * ```
 */
export function createSmartPollingInterval(defaultInterval: number) {
  return () => {
    const { areGlobalEventsRecent } = useEventRecencyStore.getState();
    return areGlobalEventsRecent() ? false : defaultInterval;
  };
}

/**
 * Helper function to get current event recency state (for use outside React)
 * Useful in query configurations where hooks can't be used directly.
 *
 * @returns Whether global events are recent
 */
export function getGlobalEventsRecent(): boolean {
  return useEventRecencyStore.getState().areGlobalEventsRecent();
}

/**
 * Helper function to get event recency for a specific query key (for use outside React)
 *
 * @param queryKey - The query key to check
 * @returns Whether events for that query key are recent
 */
export function getEventsRecent(queryKey: string): boolean {
  return useEventRecencyStore.getState().areEventsRecent(queryKey);
}
