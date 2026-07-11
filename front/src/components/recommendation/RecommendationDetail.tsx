import type { Recommendation } from '../../types/domain';
import { useTranslation } from '../../i18n';

// RecommendationDetail.tsx — reason_text 전문 노출 (XAI, FR-6.1/6.2)
export function RecommendationDetail({ recommendation }: { recommendation: Recommendation }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-13 w-13 rounded-full bg-gradient-to-br from-brand-coral to-brand-indigo p-[2px]">
          <div className="h-full w-full rounded-full bg-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-navy">{t.recommendationDetail.candidate}</p>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-brand-coral to-brand-indigo p-4 text-white">
        <span className="text-2xl font-bold">{recommendation.complementScore}%</span>{' '}
        <span className="text-xs opacity-80">{t.recommendationDetail.score}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {recommendation.gapTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-brand-coral/15 px-3 py-1 text-xs font-semibold text-brand-navy"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-neutral-300 p-4">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-wide text-neutral-400">
          {t.recommendationDetail.reason}
        </p>
        <p className="text-xs leading-relaxed text-neutral-600">{recommendation.reasonText}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-neutral-600">{t.recommendationDetail.profileSummary}</p>

        <div>
          <p className="mb-1 text-[10px] text-neutral-400">{t.recommendationDetail.skills}</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.candidateProfileSummary.skillTags.map((tag) => (
              <span key={tag} className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] text-neutral-400">{t.recommendationDetail.interests}</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.candidateProfileSummary.interests.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-indigo/10 px-3 py-1 text-xs text-brand-navy"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
