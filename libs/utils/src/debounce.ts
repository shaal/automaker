/**
 * Debounce and throttle utilities for rate-limiting function calls
 */

/**
 * Options for the debounce function
 */
export interface DebounceOptions {
  /**
   * If true, call the function immediately on the first invocation (leading edge)
   * @default false
   */
  leading?: boolean;

  /**
   * If true, call the function after the delay on the last invocation (trailing edge)
   * @default true
   */
  trailing?: boolean;

  /**
   * Maximum time to wait before forcing invocation (useful for continuous events)
   * If set, the function will be called at most every `maxWait` milliseconds
   */
  maxWait?: number;
}

/**
 * The return type of the debounce function with additional control methods
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  /**
   * Call the debounced function
   */
  (...args: Parameters<T>): void;

  /**
   * Cancel any pending invocation
   */
  cancel(): void;

  /**
   * Immediately invoke any pending function call
   */
  flush(): void;

  /**
   * Check if there's a pending invocation
   */
  pending(): boolean;
}

/**
 * Creates a debounced version of a function that delays invoking the function
 * until after `wait` milliseconds have elapsed since the last time the debounced
 * function was invoked.
 *
 * Useful for rate-limiting events like window resize, scroll, or input changes.
 *
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param options - Optional configuration
 * @returns A debounced version of the function with cancel, flush, and pending methods
 *
 * @example
 * // Basic usage - save input after user stops typing for 300ms
 * const saveInput = debounce((value: string) => {
 *   api.save(value);
 * }, 300);
 *
 * input.addEventListener('input', (e) => saveInput(e.target.value));
 *
 * @example
 * // With leading edge - execute immediately on first call
 * const handleClick = debounce(() => {
 *   submitForm();
 * }, 1000, { leading: true, trailing: false });
 *
 * @example
 * // With maxWait - ensure function runs at least every 5 seconds during continuous input
 * const autoSave = debounce((content: string) => {
 *   saveToServer(content);
 * }, 1000, { maxWait: 5000 });
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;

  // Validate options
  if (maxWait !== undefined && maxWait < wait) {
    throw new Error('maxWait must be greater than or equal to wait');
  }

  function invokeFunc(): void {
    const args = lastArgs;
    lastArgs = null;
    lastInvokeTime = Date.now();

    if (args !== null) {
      fn(...args);
    }
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = lastCallTime === null ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    // First call, or wait time has passed, or maxWait exceeded
    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): void {
    const time = Date.now();

    if (shouldInvoke(time)) {
      trailingEdge();
      return;
    }

    // Restart the timer with remaining time
    const timeSinceLastCall = lastCallTime === null ? 0 : time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    const remainingWait =
      maxWait !== undefined ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;

    timeoutId = setTimeout(timerExpired, remainingWait);
  }

  function trailingEdge(): void {
    timeoutId = null;

    if (trailing && lastArgs !== null) {
      invokeFunc();
    }

    lastArgs = null;
  }

  function leadingEdge(time: number): void {
    lastInvokeTime = time;

    // Start timer for trailing edge
    timeoutId = setTimeout(timerExpired, wait);

    // Invoke leading edge
    if (leading) {
      invokeFunc();
    }
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
    lastCallTime = null;
    lastInvokeTime = 0;
  }

  function flush(): void {
    if (timeoutId !== null) {
      invokeFunc();
      cancel();
    }
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        leadingEdge(time);
        return;
      }

      // Handle maxWait case
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, wait);
        invokeFunc();
        return;
      }
    }

    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, wait);
    }
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * Options for the throttle function
 */
export interface ThrottleOptions {
  /**
   * If true, call the function on the leading edge
   * @default true
   */
  leading?: boolean;

  /**
   * If true, call the function on the trailing edge
   * @default true
   */
  trailing?: boolean;
}

/**
 * Creates a throttled version of a function that only invokes the function
 * at most once per every `wait` milliseconds.
 *
 * Useful for rate-limiting events like scroll or mousemove where you want
 * regular updates but not on every event.
 *
 * @param fn - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @param options - Optional configuration
 * @returns A throttled version of the function with cancel, flush, and pending methods
 *
 * @example
 * // Throttle scroll handler to run at most every 100ms
 * const handleScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100);
 *
 * window.addEventListener('scroll', handleScroll);
 *
 * @example
 * // Throttle with leading edge only (no trailing call)
 * const submitOnce = throttle(() => {
 *   submitForm();
 * }, 1000, { trailing: false });
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): DebouncedFunction<T> {
  const { leading = true, trailing = true } = options;

  return debounce(fn, wait, {
    leading,
    trailing,
    maxWait: wait,
  });
}
