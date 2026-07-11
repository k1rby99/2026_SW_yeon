import { useState } from 'react';
import { useTranslation } from '../../i18n';

// FeedbackForm.tsx — FR-8.1/8.2, 하단 시트형
export function FeedbackForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: { satisfactionScore: number; comment: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [score, setScore] = useState(4);
  const [comment, setComment] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ satisfactionScore: score, comment });
      }}
      className="flex flex-col gap-3 rounded-t-2xl border border-brand-navy p-5"
    >
      <p className="text-sm font-semibold text-brand-navy">{t.feedback.title}</p>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            aria-pressed={score === n}
            className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
              score === n
                ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-indigo font-bold text-white'
                : 'border-neutral-300 text-neutral-500'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t.feedback.commentPlaceholder}
        className="min-h-[50px] rounded-lg border border-neutral-300 p-3 text-xs outline-none focus:border-brand-indigo"
      />

      <p className="text-[10px] text-neutral-400">{t.feedback.disclosure}</p>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-center text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? t.common.submitting : t.common.submit}
      </button>
    </form>
  );
}
