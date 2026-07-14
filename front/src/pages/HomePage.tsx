import { ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomCard } from '../components/room/RoomCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnalyzingState } from '../components/common/AnalyzingState';
import { useRecommendedRooms } from '../hooks/useRooms';
import { useGoalHistory } from '../hooks/useGoals';
import { useTranslation } from '../i18n';
import { useOpportunities } from '../hooks/useOpportunities';

export function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useRecommendedRooms();
  const { data: goals } = useGoalHistory();
  const { data: opportunities } = useOpportunities(undefined, true);

  const recommendations = data?.items ?? [];
  const hasRegisteredGoal = (goals?.length ?? 0) > 0;

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <p>{t.home.eyebrow}</p>
          <h1>{t.home.greeting}</h1>
        </div>
        <button type="button" className="home-notification" aria-label={t.home.notifications}>
          <Bell aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </header>

      <section className="home-section">
        <div className="home-section-heading">
          <h2>{t.home.contestsTitle}</h2>
          <Link to="/opportunities">{t.home.viewAll}<ArrowRight /></Link>
        </div>
        <div className="home-contest-list">
          {opportunities?.items.map((opportunity, index) => (
            <Link to={`/opportunities/${opportunity.id}`} className="home-contest-card" key={opportunity.id}>
              <img src={opportunity.imageUrl} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
              <div>
                <span className="home-contest-category">{opportunity.category}</span>
                <h3>{opportunity.title}</h3>
                <span className="home-contest-deadline">{opportunity.deadline.replaceAll('-', '.')}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section home-recommendation-section">
        <div className="home-section-heading">
          <div>
            <h2>{t.home.recommendationsTitle}</h2>
            <p>{t.home.recommendationsSubtitle}</p>
          </div>
        </div>

        {isLoading ? (
          // 추천은 AI가 계산한다. 첫 회 10초 안팎이 걸리므로 스켈레톤만으로는 멈춘 것처럼 보인다.
          <AnalyzingState title={t.analyzing.rooms.title} steps={t.analyzing.rooms.steps} />
        ) : recommendations.length > 0 ? (
          <div className="home-room-list">
            {recommendations.map((room) => <RoomCard key={room.id} room={room} compact />)}
          </div>
        ) : (
          <EmptyState
            title={hasRegisteredGoal ? t.home.emptyNoCandidatesTitle : t.home.emptyNoGoalTitle}
            description={hasRegisteredGoal ? t.home.emptyNoCandidatesDescription : t.home.emptyNoGoalDescription}
          />
        )}

        {data?.nextCursor && <button type="button" className="home-load-more">{t.common.loadMore}<ArrowRight aria-hidden="true" /></button>}
      </section>
    </div>
  );
}
