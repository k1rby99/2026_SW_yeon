import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ConnectionRoom, GoalAnalysis, RoomApplication, RoomCandidate, RoomMessage, RoomStatus, RoomUpsertPayload } from '../types/domain';

export function useRecommendedRooms() {
  return useQuery<{ items: ConnectionRoom[]; nextCursor: string | null }>({
    queryKey: ['rooms', 'recommended'],
    queryFn: () => apiClient.get('/api/rooms/recommended?size=10'),
  });
}

export function useMyRooms(status: RoomStatus) {
  return useQuery<ConnectionRoom[]>({
    queryKey: ['rooms', 'mine', status],
    queryFn: () => apiClient.get(`/api/rooms?scope=mine&status=${status}`),
  });
}

export function useRoom(roomId: string | undefined) {
  return useQuery<ConnectionRoom>({
    queryKey: ['rooms', roomId],
    queryFn: () => apiClient.get(`/api/rooms/${roomId}`),
    enabled: !!roomId,
  });
}

export function useAnalyzeGoal() {
  return useMutation({
    mutationFn: (payload: { text: string; keywords: string[] }) =>
      apiClient.post<GoalAnalysis>('/api/goals/analyze', payload),
  });
}

export function useApplyToRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => apiClient.post(`/api/rooms/${roomId}/applications`, { message: '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoomUpsertPayload) => apiClient.post<ConnectionRoom>('/api/rooms', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useUpdateRoom(roomId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<RoomUpsertPayload & { status: RoomStatus }>) =>
      apiClient.patch<ConnectionRoom>(`/api/rooms/${roomId}`, payload),
    onSuccess: (room) => {
      queryClient.setQueryData(['rooms', room.id], room);
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] });
    },
  });
}

export function useRoomCandidates(roomId: string | undefined) {
  return useQuery<RoomCandidate[]>({
    queryKey: ['rooms', roomId, 'candidates'],
    queryFn: () => apiClient.get(`/api/rooms/${roomId}/candidates`),
    enabled: !!roomId,
  });
}

export function useInviteCandidate(roomId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string; message: string }) =>
      apiClient.post(`/api/rooms/${roomId}/invitations`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'candidates'] }),
  });
}

export function useRoomApplications(roomId: string | undefined) {
  return useQuery<RoomApplication[]>({
    queryKey: ['rooms', roomId, 'applications'],
    queryFn: () => apiClient.get(`/api/rooms/${roomId}/applications`),
    enabled: !!roomId,
  });
}

export function useResolveRoomApplication(roomId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, action }: { applicationId: string; action: 'approve' | 'reject' }) =>
      apiClient.patch(`/api/rooms/${roomId}/applications/${applicationId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] });
    },
  });
}

export function useRoomMessages(roomId: string | undefined) {
  return useQuery<{ items: RoomMessage[]; nextCursor: string | null }>({
    queryKey: ['rooms', roomId, 'messages'],
    queryFn: () => apiClient.get(`/api/rooms/${roomId}/messages`),
    enabled: !!roomId,
  });
}

export function useSendRoomMessage(roomId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => apiClient.post<RoomMessage>(`/api/rooms/${roomId}/messages`, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'messages'] }),
  });
}
