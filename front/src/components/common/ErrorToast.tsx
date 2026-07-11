import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n';

const variantStyles: Record<string, string> = {
  error: 'bg-red-50 border-red-300 text-red-700',
  success: 'bg-green-50 border-green-300 text-green-700',
  info: 'bg-white border-brand-navy/20 text-brand-navy',
};

export function ErrorToast() {
  const { t } = useTranslation();
  const { toasts, dismissToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${variantStyles[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label={t.common.close}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
