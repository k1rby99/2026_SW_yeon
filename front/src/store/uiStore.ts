import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  variant: 'error' | 'success' | 'info';
}

interface UiState {
  toasts: Toast[];
  pushToast: (message: string, variant?: Toast['variant']) => void;
  dismissToast: (id: string) => void;

  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (message, variant = 'error') =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, variant }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  onboardingStep: 1,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
}));
