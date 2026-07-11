import { Link, useParams } from 'react-router-dom';
import { RecommendationDetail } from '../components/recommendation/RecommendationDetail';
import { ActionButtons } from '../components/recommendation/ActionButtons';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useRecommendation } from '../hooks/useRecommendations';
import { useTranslation } from '../i18n';

// S6 추천 상세
export function RecommendationDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: recommendation, isLoading } = useRecommendation(id);

  if (isLoading) return <LoadingSpinner label={t.recommendationDetail.loading} />;

  if (!recommendation) {
    return (
      <div className="px-6 py-8 md:mx-auto md:max-w-xl md:px-10 md:py-10">
        <EmptyState
          title={t.recommendationDetail.notFoundTitle}
          description={t.recommendationDetail.notFoundDescription}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 md:mx-auto md:max-w-xl md:px-10 md:py-10">
      <Link to="/" className="text-xs text-neutral-400">
        {t.recommendationDetail.back}
      </Link>
      <RecommendationDetail recommendation={recommendation} />
      <ActionButtons recommendationId={recommendation.id} />
    </div>
  );
}
