import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Opportunity, OpportunityType } from '../types/domain';

export function useOpportunities(type?: OpportunityType, featured = false) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (featured) params.set('featured', 'true');
  const query = params.toString();
  return useQuery<{ items: Opportunity[] }>({
    queryKey: ['opportunities', type ?? 'all', featured],
    queryFn: () => apiClient.get(`/api/opportunities${query ? `?${query}` : ''}`),
  });
}

export function useOpportunity(opportunityId: string | undefined) {
  return useQuery<Opportunity>({
    queryKey: ['opportunities', opportunityId],
    queryFn: () => apiClient.get(`/api/opportunities/${opportunityId}`),
    enabled: !!opportunityId,
  });
}
