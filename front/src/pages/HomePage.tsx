import { ArrowRight, Bell } from 'lucide-react';
import { RoomCard } from '../components/room/RoomCard';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { useRecommendedRooms } from '../hooks/useRooms';
import { useGoalHistory } from '../hooks/useGoals';
import { useTranslation } from '../i18n';

const CONTEST_IMAGES = [
  '/contests/ai-innovation.png',
  '/contests/public-data.png',
  '/contests/startup-design.png',
] as const;

export function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useRecommendedRooms();
  const { data: goals } = useGoalHistory();

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
          <span>{t.home.swipeHint}</span>
        </div>
        <div className="home-contest-list">
          {t.home.contests.map((contest, index) => (
            <article className="home-contest-card" key={contest.title}>
              <img src={CONTEST_IMAGES[index]} alt="" loading={index === 0 ? 'eager' : 'lazy'} />
              <div>
                <span className="home-contest-category">{contest.category}</span>
                <h3>{contest.title}</h3>
                <span className="home-contest-deadline">{contest.deadline}</span>
              </div>
            </article>
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
          <div className="home-profile-list">
            {Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)}
          </div>
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
