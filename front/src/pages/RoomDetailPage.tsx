import { ArrowLeft, ChevronRight, MessageCircle, Settings2, UserPlus, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useApplyToRoom, useRoom, useRoomMembers } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

export function RoomDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: room, isLoading } = useRoom(id);
  const joined = room?.membershipRole !== null && room?.membershipRole !== undefined;
  const { data: members } = useRoomMembers(joined ? id : undefined);
  const apply = useApplyToRoom();
  const pushToast = useUiStore((state) => state.pushToast);
  if (isLoading || !room) return <LoadingSpinner />;
  return <div className="room-detail-page">
    <Link to={joined ? '/matches' : '/'} className="room-detail-back"><ArrowLeft />{t.common.back}</Link>
    {room.imageUrl && <img src={room.imageUrl} alt="" className="room-detail-cover" />}
    <header className="room-detail-header"><span>{t.rooms.types[room.type]} · {t.rooms.status[room.status]}</span><h1>{room.title}</h1><p>{room.summary}</p><div className="room-card-tags">{room.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="room-detail-stats"><span><UsersRound />{room.memberCount}/{room.capacity}</span><span>{t.rooms.owner} {room.owner.name}</span></div></header>
    <section className="room-detail-section"><h2>{t.rooms.requiredRoles}</h2><div className="profile-chip-list is-purple">{room.requiredRoles.length ? room.requiredRoles.map((role) => <span key={role}>{role}</span>) : <span>{t.rooms.openRole}</span>}</div></section>
    {!joined ? <button type="button" className="room-primary-action" disabled={room.applicationStatus === 'pending' || apply.isPending} onClick={async () => { await apply.mutateAsync(room.id); pushToast(t.rooms.applicationSent, 'success'); }}><UserPlus />{room.applicationStatus === 'pending' ? t.rooms.applicationPending : t.rooms.apply}</button> : <>
      <section className="room-detail-section room-members-section"><div className="room-section-heading"><h2>{t.roomMembers.title}</h2><span>{t.roomMembers.count(members?.length ?? room.memberCount)}</span></div><div className="room-member-list">{members?.map((member) => <Link key={member.id} to={`/rooms/${room.id}/members/${member.id}`}><div className="room-member-avatar" aria-hidden="true">{member.name.slice(0, 1)}</div><div><strong>{member.name}{member.isOwner && <span>{t.roomMembers.ownerBadge}</span>}</strong><small>{member.role}</small><p>{member.skillTags.slice(0, 3).join(' · ')}</p></div><ChevronRight /></Link>)}</div></section>
      <section className="room-chat-preview"><div className="room-chat-preview-header"><span><MessageCircle /><strong>{t.rooms.chat}</strong></span><Link to={`/rooms/${room.id}/chat`}>{t.rooms.openChat}<ChevronRight /></Link></div><p>{t.rooms.chatPreview}</p></section>
      {room.membershipRole === 'owner' && <section className="room-owner-tools"><h2><Settings2 />{t.rooms.ownerTools}</h2><div className="room-owner-tool-list"><Link to={`/rooms/${room.id}/settings`}><Settings2 /><span><strong>{t.rooms.settings}</strong><small>{t.rooms.settingsDescription}</small></span><ChevronRight /></Link><Link to={`/rooms/${room.id}/invite`}><UserPlus /><span><strong>{t.rooms.invite}</strong><small>{t.rooms.inviteDescription}</small></span><ChevronRight /></Link><Link to={`/rooms/${room.id}/applications`}><UsersRound /><span><strong>{t.rooms.applications}</strong><small>{t.rooms.applicationsDescription}</small></span><ChevronRight /></Link></div></section>}
    </>}
  </div>;
}
