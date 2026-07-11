import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { MatchRelation, MatchStatus } from '../types/domain';

export function useMatches(status?: MatchStatus) {
  return useQuery<MatchRelation[]>({
    queryKey: ['matches', { status }],
    queryFn: () =>
      apiClient.get<MatchRelation[]>(`/api/matches${status ? `?status=${status}` : ''}`),
  });
}

// PATCH /api/matches/:id — 백엔드 협의 필요 항목 (dev_next_subject1.md 참조)
export function useEndMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => apiClient.patch<MatchRelation>(`/api/matches/${matchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
