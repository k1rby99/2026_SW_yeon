import { ArrowLeft, Check, Clock, Sparkles, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useResolveRoomApplication, useRoom, useRoomApplications } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

export function RoomApplicationsPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: room } = useRoom(id);
  const { data: applications, isLoading } = useRoomApplications(id);
  const resolve = useResolveRoomApplication(id);
  const pushToast = useUiStore((state) => state.pushToast);

  const act = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      await resolve.mutateAsync({ applicationId, action });
      pushToast(action === 'approve' ? t.roomManagement.applicationApproved : t.roomManagement.applicationRejected, 'success');
    } catch {
      pushToast(t.roomManagement.applicationFailed, 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  const pendingCount = applications?.filter((item) => item.status === 'pending').length ?? 0;
  return <div className="room-workspace-page">
    <header className="room-workspace-header"><Link to={`/rooms/${id}`} aria-label={t.common.back}><ArrowLeft /></Link><div><span>{room?.title}</span><h1>{t.roomManagement.applicationsTitle}</h1></div></header>
    <div className="room-application-summary"><Clock /><div><strong>{t.roomManagement.pendingApplications(pendingCount)}</strong><span>{t.roomManagement.capacityStatus(room?.memberCount ?? 0, room?.capacity ?? 0)}</span></div></div>
    <div className="room-application-list">
      {applications?.map((application) => <article className="room-application-card" key={application.id}>
        <div className="room-application-heading"><div className="room-candidate-avatar" aria-hidden="true">{application.applicant.name.slice(0, 1)}</div><div><h2>{application.applicant.name}</h2><span>{application.applicant.role}</span></div><strong className={`is-${application.status}`}>{t.roomManagement.applicationStatus[application.status]}</strong></div>
        <div className="room-candidate-tags">{application.applicant.skillTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <blockquote>{application.message}</blockquote>
        <div className="room-match-reason"><Sparkles /><span>{application.applicant.reason}</span></div>
        {application.status === 'pending' && <div className="room-application-actions"><button type="button" disabled={resolve.isPending} onClick={() => act(application.id, 'reject')}><X />{t.roomManagement.reject}</button><button type="button" disabled={resolve.isPending} onClick={() => act(application.id, 'approve')}><Check />{t.roomManagement.approve}</button></div>}
      </article>)}
      {applications?.length === 0 && <p className="room-workspace-empty">{t.roomManagement.noApplications}</p>}
    </div>
  </div>;
}
