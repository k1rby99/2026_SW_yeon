import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Goal } from '../types/domain';

const POLL_TIMEOUT_MS = 30_000; // 2초 간격 폴링 30초 상한, dev_plan_front.md §7.2

export function useGoalHistory() {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => apiClient.get<Goal[]>('/api/goals'),
  });
}

function isPollTimedOut(goal: Goal | undefined) {
  return !!(
    goal &&
    goal.status === 'processing' &&
    Date.now() - new Date(goal.createdAt).getTime() >= POLL_TIMEOUT_MS
  );
}

export function useGoal(goalId: string | null) {
  const query = useQuery<Goal>({
    queryKey: ['goals', goalId],
    queryFn: () => apiClient.get<Goal>(`/api/goals/${goalId}`),
    enabled: !!goalId,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data || data.status !== 'processing' || isPollTimedOut(data)) return false;
      return 2000;
    },
  });

  // 폴링 상한(30초) 초과 시 EC-1과 동일하게 재시도 유도 (백엔드 status가 끝내 갱신되지 않는 경우 대비)
  return { ...query, isTimedOut: isPollTimedOut(query.data) };
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { text: string; category: string }) =>
      apiClient.post<Goal>('/api/goals', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
