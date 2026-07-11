import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { PaginatedResponse, Recommendation } from '../types/domain';

const PAGE_SIZE = 6;

export function useRecommendations() {
  return useInfiniteQuery<PaginatedResponse<Recommendation>>({
    queryKey: ['recommendations'],
    queryFn: ({ pageParam }) =>
      apiClient.get<PaginatedResponse<Recommendation>>(
        `/api/recommendations?page=${pageParam}&size=${PAGE_SIZE}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}

export function useRecommendation(id: string | undefined) {
  return useQuery<Recommendation>({
    queryKey: ['recommendations', id],
    queryFn: () => apiClient.get<Recommendation>(`/api/recommendations/${id}`),
    enabled: !!id,
  });
}
