import { Link } from 'react-router-dom';
import { RecommendationCard } from '../components/recommendation/RecommendationCard';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { useRecommendations } from '../hooks/useRecommendations';
import { useGoalHistory } from '../hooks/useGoals';
import { useTranslation } from '../i18n';

// S5 추천 리스트 — front_request.md FR-5.1~5.4
// 카드 그리드: 모바일 1열 / sm 2열 / lg 3열 (§9 반응형 요구사항)
export function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useRecommendations();
  const { data: goals } = useGoalHistory();

  const recommendations = data?.pages.flatMap((page) => page.items) ?? [];
  const hasRegisteredGoal = (goals?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-6 py-8 md:px-10 md:py-10">
        <h1 className="text-lg font-bold text-brand-navy">{t.home.title}</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    // EC-2: "목표 미등록" vs "적합 후보 없음" 사유별 분기
    return (
      <div className="px-6 py-8 md:px-10 md:py-10">
        {hasRegisteredGoal ? (
          <EmptyState
            title={t.home.emptyNoCandidatesTitle}
            description={t.home.emptyNoCandidatesDescription}
          />
        ) : (
          <EmptyState
            title={t.home.emptyNoGoalTitle}
            description={t.home.emptyNoGoalDescription}
            action={
              <Link
                to="/goals"
                className="mt-2 rounded-full bg-gradient-to-r from-brand-coral to-brand-indigo px-4 py-1.5 text-xs font-semibold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90"
              >
                {t.home.goToGoals}
              </Link>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8 md:px-10 md:py-10">
      <h1 className="text-lg font-bold text-brand-navy">{t.home.title}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </div>

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-2 rounded-lg border border-neutral-300 py-2 text-xs text-neutral-500 disabled:opacity-50"
        >
          {isFetchingNextPage ? t.common.loadingMore : t.common.loadMore}
        </button>
      )}
    </div>
  );
}
