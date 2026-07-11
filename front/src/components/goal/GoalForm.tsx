import { useState } from 'react';
import { useTranslation } from '../../i18n';

// GoalForm.tsx — FR-4.1: 자연어 목표 + 카테고리 하이브리드 폼
export function GoalForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: { text: string; category: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>(t.goalForm.categories[0]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSubmit({ text, category });
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="goal-text" className="text-xs font-semibold text-neutral-600">
        {t.goalForm.label}
      </label>
      <textarea
        id="goal-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.goalForm.placeholder}
        className="min-h-[80px] rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-brand-indigo"
      />

      <div className="flex flex-wrap gap-2">
        {t.goalForm.categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              category === c
                ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-indigo text-white'
                : 'border-neutral-300 text-neutral-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={submitting || !text.trim()}
        className="rounded-lg bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-center text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? t.goalForm.submitting : t.goalForm.submit}
      </button>
    </form>
  );
}
