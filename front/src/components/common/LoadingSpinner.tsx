import { useTranslation } from '../../i18n';

export function LoadingSpinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-neutral-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-indigo border-t-transparent" />
      <span>{label ?? t.common.loading}</span>
    </div>
  );
}
