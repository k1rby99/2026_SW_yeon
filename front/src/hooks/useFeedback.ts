import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { FeedbackPayload } from '../types/domain';

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (payload: FeedbackPayload) => apiClient.post('/api/feedback', payload),
  });
}
