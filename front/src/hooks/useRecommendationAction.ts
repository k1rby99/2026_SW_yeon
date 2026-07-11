import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../api/client';
import type { PaginatedResponse, Recommendation, RecommendationAction } from '../types/domain';

// front_request.md FR-6.3/FR-6.4, EC-3: optimistic update + 중복 액션(409) 방지

export function useRecommendationActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: RecommendationAction }) =>
      apiClient.post(`/api/recommendations/${id}/action`, { action }),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['recommendations'] });
      const previous = queryClient.getQueryData(['recommendations']);

      queryClient.setQueriesData<{ pages: PaginatedResponse<Recommendation>[] } | undefined>(
        { queryKey: ['recommendations'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== id),
            })),
          };
        },
      );

      return { previous };
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['recommendations'], context.previous);
      }
      if (err instanceof ApiError && err.status === 409) {
        // EC-3: 이미 처리된 추천 — 서버 상태 기준으로 리스트 재동기화
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
