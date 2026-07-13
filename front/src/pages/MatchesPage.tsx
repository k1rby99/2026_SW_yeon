import { useState } from 'react';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RoomCard } from '../components/room/RoomCard';
import { useMyRooms } from '../hooks/useRooms';
import { useTranslation } from '../i18n';
import type { RoomStatus } from '../types/domain';

export function MatchesPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Extract<RoomStatus, 'active' | 'ended'>>('active');
  const { data: rooms, isLoading } = useMyRooms(status);
  return (
    <div className="tab-page matches-page">
      <header className="tab-page-header"><p>{t.matchesPage.eyebrow}</p><h1>{t.matchesPage.title}</h1><span>{t.matchesPage.subtitle}</span></header>
      <div className="tab-segmented" role="group" aria-label={t.matchesPage.filterLabel}>
        <button type="button" className={status === 'active' ? 'is-selected' : ''} onClick={() => setStatus('active')} aria-pressed={status === 'active'}>{t.matchesPage.active}</button>
        <button type="button" className={status === 'ended' ? 'is-selected' : ''} onClick={() => setStatus('ended')} aria-pressed={status === 'ended'}>{t.matchesPage.ended}</button>
      </div>
      <section className="matches-room-list">
        <div className="matches-list-heading"><strong>{status === 'active' ? t.matchesPage.activeRooms : t.matchesPage.endedRooms}</strong><span>{rooms?.length ?? 0}</span></div>
        {isLoading ? <LoadingSpinner /> : rooms?.length ? rooms.map((room) => <RoomCard key={room.id} room={room} compact />) : <EmptyState title={t.matchesPage.emptyTitle} description={t.matchesPage.emptyDescription} />}
      </section>
    </div>
  );
}
