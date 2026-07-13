import { ArrowLeft, ChevronRight, MessageCircle, Settings2, UserPlus, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useApplyToRoom, useRoom } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

export function RoomDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: room, isLoading } = useRoom(id);
  const apply = useApplyToRoom();
  const pushToast = useUiStore((state) => state.pushToast);
  if (isLoading || !room) return <LoadingSpinner />;
  const joined = room.membershipRole !== null;
  return <div className="room-detail-page">
    <Link to={joined ? '/matches' : '/'} className="room-detail-back"><ArrowLeft />{t.common.back}</Link>
    {room.imageUrl && <img src={room.imageUrl} alt="" className="room-detail-cover" />}
    <header className="room-detail-header"><span>{t.rooms.types[room.type]} · {t.rooms.status[room.status]}</span><h1>{room.title}</h1><p>{room.summary}</p><div className="room-card-tags">{room.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="room-detail-stats"><span><UsersRound />{room.memberCount}/{room.capacity}</span><span>{t.rooms.owner} {room.owner.name}</span></div></header>
    <section className="room-detail-section"><h2>{t.rooms.requiredRoles}</h2><div className="profile-chip-list is-purple">{room.requiredRoles.length ? room.requiredRoles.map((role) => <span key={role}>{role}</span>) : <span>{t.rooms.openRole}</span>}</div></section>
    {!joined ? <button type="button" className="room-primary-action" disabled={room.applicationStatus === 'pending' || apply.isPending} onClick={async () => { await apply.mutateAsync(room.id); pushToast(t.rooms.applicationSent, 'success'); }}><UserPlus />{room.applicationStatus === 'pending' ? t.rooms.applicationPending : t.rooms.apply}</button> : <>
      <section className="room-chat-preview"><div><MessageCircle /><strong>{t.rooms.chat}</strong></div><p>{t.rooms.chatPreview}</p><Link to={`/rooms/${room.id}/chat`}>{t.rooms.openChat}</Link></section>
      {room.membershipRole === 'owner' && <section className="room-owner-tools"><h2><Settings2 />{t.rooms.ownerTools}</h2><div className="room-owner-tool-list"><Link to={`/rooms/${room.id}/settings`}><Settings2 /><span><strong>{t.rooms.settings}</strong><small>{t.rooms.settingsDescription}</small></span><ChevronRight /></Link><Link to={`/rooms/${room.id}/invite`}><UserPlus /><span><strong>{t.rooms.invite}</strong><small>{t.rooms.inviteDescription}</small></span><ChevronRight /></Link><Link to={`/rooms/${room.id}/applications`}><UsersRound /><span><strong>{t.rooms.applications}</strong><small>{t.rooms.applicationsDescription}</small></span><ChevronRight /></Link></div></section>}
    </>}
  </div>;
}
