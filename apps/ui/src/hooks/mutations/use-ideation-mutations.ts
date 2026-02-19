/**
 * Ideation Mutation Hooks
 *
 * React Query mutations for ideation operations like generating suggestions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getElectronAPI } from '@/lib/electron';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import type { IdeaCategory, AnalysisSuggestion } from '@automaker/types';
import { useIdeationStore } from '@/store/ideation-store';

/**
 * Input for generating ideation suggestions
 */
interface GenerateSuggestionsInput {
  promptId: string;
  category: IdeaCategory;
  /** Job ID for tracking generation progress - used to update job status on completion */
  jobId: string;
  /** Prompt title for toast notifications */
  promptTitle: string;
}

/**
 * Result from generating suggestions
 */
interface GenerateSuggestionsResult {
  suggestions: AnalysisSuggestion[];
  promptId: string;
  category: IdeaCategory;
  /** Job ID passed through for onSuccess handler */
  jobId: string;
  /** Prompt title passed through for toast notifications */
  promptTitle: string;
}

/**
 * Generate ideation suggestions based on a prompt
 *
 * @param projectPath - Path to the project
 * @returns Mutation for generating suggestions
 *
 * @example
 * ```tsx
 * const generateMutation = useGenerateIdeationSuggestions(projectPath);
 *
 * generateMutation.mutate({
 *   promptId: 'prompt-1',
 *   category: 'ux',
 * }, {
 *   onSuccess: (data) => {
 *     console.log('Generated', data.suggestions.length, 'suggestions');
 *   },
 * });
 * ```
 */
export function useGenerateIdeationSuggestions(projectPath: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateSuggestionsInput): Promise<GenerateSuggestionsResult> => {
      const { promptId, category, jobId, promptTitle } = input;

      const api = getElectronAPI();
      if (!api.ideation?.generateSuggestions) {
        throw new Error('Ideation API not available');
      }

      // Get context sources from store
      const contextSources = useIdeationStore.getState().getContextSources(projectPath);

      const result = await api.ideation.generateSuggestions(
        projectPath,
        promptId,
        category,
        undefined, // count - use default
        contextSources
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate suggestions');
      }

      return {
        suggestions: result.suggestions ?? [],
        promptId,
        category,
        jobId,
        promptTitle,
      };
    },
    onSuccess: (data) => {
      // Update job status in Zustand store - this runs even if the component unmounts
      // Using getState() to access store directly without hooks (safe in callbacks)
      const updateJobStatus = useIdeationStore.getState().updateJobStatus;
      updateJobStatus(data.jobId, 'ready', data.suggestions);

      // Show success toast
      toast.success(`Generated ${data.suggestions.length} ideas for "${data.promptTitle}"`, {
        duration: 10000,
      });

      // Invalidate ideation ideas cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideation.ideas(projectPath),
      });
    },
    onError: (error, variables) => {
      // Update job status to error - this runs even if the component unmounts
      const updateJobStatus = useIdeationStore.getState().updateJobStatus;
      updateJobStatus(variables.jobId, 'error', undefined, error.message);

      // Show error toast
      toast.error(`Failed to generate ideas: ${error.message}`);
    },
  });
}
