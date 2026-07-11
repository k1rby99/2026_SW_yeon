import { Link } from 'react-router-dom';
import type { Recommendation } from '../../types/domain';
import { useTranslation } from '../../i18n';

// RecommendationCard.tsx — complementScore, gapTags 배지 (FR-5.1, FR-5.2)
export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/recommendations/${recommendation.id}`}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:border-brand-indigo/40 hover:shadow-md"
    >
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-coral to-brand-indigo p-[2px]">
        <div className="h-full w-full rounded-full bg-white" />
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap gap-1">
          {recommendation.gapTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-brand-coral/15 px-2 py-0.5 text-[10px] font-semibold text-brand-navy"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {recommendation.candidateProfileSummary.skillTags.slice(0, 3).join(' · ')}
        </p>
      </div>
      <div
        className="rounded-full bg-gradient-to-r from-brand-coral to-brand-indigo px-3 py-1 text-xs font-bold text-white"
        aria-label={`${t.recommendationDetail.score} ${recommendation.complementScore}%`}
      >
        {recommendation.complementScore}%
      </div>
    </Link>
  );
}
