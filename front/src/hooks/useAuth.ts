import { useMutation } from '@tanstack/react-query';
import { apiClient, tokenStore } from '../api/client';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiClient.post<AuthResponse>('/api/auth/login', payload),
    onSuccess: (data) => tokenStore.set(data.accessToken, data.refreshToken),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiClient.post<AuthResponse>('/api/auth/signup', payload),
    onSuccess: (data) => tokenStore.set(data.accessToken, data.refreshToken),
  });
}
