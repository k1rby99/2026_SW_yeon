import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ConnectionRoom, GoalAnalysis, ReceivedInvitation, RoomApplication, RoomCandidate, RoomMemberProfile, RoomMemberSummary, RoomMessage, RoomStatus, RoomUpsertPayload } from '../types/domain';

export function useRecommendedRooms() {
  return useQuery<{ items: ConnectionRoom[]; nextCursor: string | null }>({
    queryKey: ['rooms', 'recommended'],
    queryFn: () => apiClient.get('/api/rooms/recommended?size=10'),
  });
}

/**
 * 내가 방장이거나 참여 중인 인연 전체.
 *
 * 상태별로 따로 부르지 않고 한 번에 받아 화면에서 나눈다. 그래야 탭마다 개수를 보여줄 수
 * 있고, 방금 만든 모집 중인 방이 어느 탭에 있는지 사용자가 바로 알 수 있다.
 */
export function useMyRooms() {
  return useQuery<ConnectionRoom[]>({
    queryKey: ['rooms', 'mine'],
    queryFn: () => apiClient.get('/api/rooms?scope=mine'),
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

/** 내가 받은 초대(아직 답하지 않은 것). 초대는 방 밖에서 오므로 방 id가 없다. */
export function useReceivedInvitations() {
  return useQuery<ReceivedInvitation[]>({
    queryKey: ['invitations'],
    queryFn: () => apiClient.get('/api/invitations'),
  });
}

export function useDecideInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId, action }: { invitationId: string; action: 'accept' | 'decline' }) =>
      apiClient.patch<ReceivedInvitation>(`/api/invitations/${invitationId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      // 수락하면 멤버가 되므로 나의 인연과 추천 목록이 함께 바뀐다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
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
    // 실시간 소켓이 없으므로 채팅방에 머무는 동안만 짧게 폴링한다.
    // 이게 없으면 상대가 보낸 메시지는 화면을 나갔다 들어와야 보인다.
    refetchInterval: 3000,
    // 다른 탭을 보고 있을 때까지 부를 이유는 없다.
    refetchIntervalInBackground: false,
  });
}

export function useSendRoomMessage(roomId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => apiClient.post<RoomMessage>(`/api/rooms/${roomId}/messages`, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'messages'] }),
  });
}

export function useRoomMembers(roomId: string | undefined) {
  return useQuery<RoomMemberSummary[]>({
    queryKey: ['rooms', roomId, 'members'],
    queryFn: () => apiClient.get(`/api/rooms/${roomId}/members`),
    enabled: !!roomId,
  });
}

export function useRoomMemberProfile(roomId: string | undefined, memberId: string | undefined) {
  return useQuery<RoomMemberProfile>({
    queryKey: ['rooms', roomId, 'members', memberId],
    queryFn: () => apiClient.get(`/api/rooms/${roomId}/members/${memberId}`),
    enabled: !!roomId && !!memberId,
  });
}
