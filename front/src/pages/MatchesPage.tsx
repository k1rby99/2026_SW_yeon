import { useState } from 'react';
import { Check, MailOpen } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RoomCard } from '../components/room/RoomCard';
import { useDecideInvitation, useMyRooms, useReceivedInvitations } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';
import type { RoomStatus } from '../types/domain';

export function MatchesPage() {
  const { t } = useTranslation();
  const pushToast = useUiStore((state) => state.pushToast);
  // 인연의 상태는 모집 중 → 진행 중 → 종료 셋이다. 탭이 둘뿐이면 방금 만든 방(모집 중)이
  // 어디에도 보이지 않는다.
  const [status, setStatus] = useState<RoomStatus>('recruiting');
  const { data: rooms, isLoading } = useMyRooms();
  const { data: invitations } = useReceivedInvitations();
  const decide = useDecideInvitation();

  const respond = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      await decide.mutateAsync({ invitationId, action });
      pushToast(
        action === 'accept' ? t.matchesPage.invitationAccepted : t.matchesPage.invitationDeclined,
        'success',
      );
      if (action === 'accept') setStatus('recruiting');
    } catch {
      pushToast(t.matchesPage.invitationFailed, 'error');
    }
  };

  const byStatus = (target: RoomStatus) => rooms?.filter((room) => room.status === target) ?? [];
  const visible = byStatus(status);

  const tabs: { value: RoomStatus; label: string; heading: string; emptyTitle: string; emptyDescription: string }[] = [
    {
      value: 'recruiting',
      label: t.matchesPage.recruiting,
      heading: t.matchesPage.recruitingRooms,
      emptyTitle: t.matchesPage.emptyRecruitingTitle,
      emptyDescription: t.matchesPage.emptyRecruitingDescription,
    },
    {
      value: 'active',
      label: t.matchesPage.active,
      heading: t.matchesPage.activeRooms,
      emptyTitle: t.matchesPage.emptyActiveTitle,
      emptyDescription: t.matchesPage.emptyActiveDescription,
    },
    {
      value: 'ended',
      label: t.matchesPage.ended,
      heading: t.matchesPage.endedRooms,
      emptyTitle: t.matchesPage.emptyEndedTitle,
      emptyDescription: t.matchesPage.emptyEndedDescription,
    },
  ];

  const current = tabs.find((tab) => tab.value === status) ?? tabs[0];

  return (
    <div className="tab-page matches-page">
      <header className="tab-page-header">
        <p>{t.matchesPage.eyebrow}</p>
        <h1>{t.matchesPage.title}</h1>
        <span>{t.matchesPage.subtitle}</span>
      </header>

      {/* 받은 초대는 참여로 이어지므로 인연 목록 바로 위에 둔다. 답하지 않은 초대만 온다. */}
      {invitations?.length ? (
        <section className="invitation-inbox" aria-label={t.matchesPage.invitationsTitle}>
          <div className="invitation-inbox-heading">
            <MailOpen aria-hidden="true" />
            <strong>{t.matchesPage.invitationsTitle}</strong>
            <span>{invitations.length}</span>
          </div>
          {invitations.map((invitation) => (
            <article className="invitation-card" key={invitation.id}>
              <div className="invitation-card-body">
                <span>{invitation.inviter.name}{t.matchesPage.invitationFrom}</span>
                <strong>{invitation.room.title}</strong>
                {invitation.message && <p>{invitation.message}</p>}
              </div>
              <div className="invitation-card-actions">
                <button
                  type="button"
                  className="invitation-decline"
                  disabled={decide.isPending}
                  onClick={() => respond(invitation.id, 'decline')}
                >
                  {t.matchesPage.invitationDecline}
                </button>
                <button
                  type="button"
                  className="invitation-accept"
                  disabled={decide.isPending}
                  onClick={() => respond(invitation.id, 'accept')}
                >
                  <Check aria-hidden="true" />
                  {t.matchesPage.invitationAccept}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <div className="tab-segmented" role="group" aria-label={t.matchesPage.filterLabel}>
        {tabs.map((tab) => {
          const count = byStatus(tab.value).length;
          return (
            <button
              key={tab.value}
              type="button"
              className={status === tab.value ? 'is-selected' : ''}
              onClick={() => setStatus(tab.value)}
              aria-pressed={status === tab.value}
            >
              {tab.label}
              {/* 개수를 함께 보여줘야 방금 만든 인연이 어느 탭에 있는지 바로 알 수 있다. */}
              {count > 0 && <span className="tab-segmented-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <section className="matches-room-list">
        <div className="matches-list-heading">
          <strong>{current.heading}</strong>
          <span>{visible.length}</span>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : visible.length ? (
          visible.map((room) => <RoomCard key={room.id} room={room} compact />)
        ) : (
          <EmptyState title={current.emptyTitle} description={current.emptyDescription} />
        )}
      </section>
    </div>
  );
}
