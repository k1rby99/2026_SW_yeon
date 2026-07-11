import type { Profile } from '../../types/domain';
import { useTranslation } from '../../i18n';

// VisibilityToggle.tsx — FR-3.2, EC-4
export function VisibilityToggle({
  value,
  onChange,
}: {
  value: Profile['visibilityScope'];
  onChange: (value: Profile['visibilityScope']) => void;
}) {
  const { t } = useTranslation();
  const options: { value: Profile['visibilityScope']; label: string }[] = [
    { value: 'public', label: t.visibility.public },
    { value: 'limited', label: t.visibility.limited },
    { value: 'private', label: t.visibility.private },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-neutral-600">{t.visibility.label}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`flex-1 rounded-lg border px-2 py-2 text-center text-xs transition-colors ${
              value === opt.value
                ? 'border-brand-indigo/40 bg-gradient-to-r from-brand-coral/10 to-brand-indigo/10 font-bold text-brand-navy'
                : 'border-neutral-300 text-neutral-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-neutral-400">{t.visibility.hint}</p>
      {value === 'private' && (
        <p className="rounded-lg border border-dashed border-red-300 p-2 text-[10px] text-red-500">
          {t.visibility.privateWarning}
        </p>
      )}
    </div>
  );
}
