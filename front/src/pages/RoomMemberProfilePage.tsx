import { ArrowLeft, AtSign, BriefcaseBusiness, CodeXml, ExternalLink, Link2, MessageCircle, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useRoom, useRoomMemberProfile } from '../hooks/useRooms';
import { useTranslation } from '../i18n';

export function RoomMemberProfilePage() {
  const { id, memberId } = useParams();
  const { t } = useTranslation();
  const { data: room } = useRoom(id);
  const { data: member, isLoading } = useRoomMemberProfile(id, memberId);

  if (isLoading || !member) return <LoadingSpinner />;
  return <div className="room-workspace-page room-member-profile-page">
    <header className="room-workspace-header"><Link to={`/rooms/${id}`} aria-label={t.common.back}><ArrowLeft /></Link><div><span>{room?.title}</span><h1>{t.roomMembers.profileTitle}</h1></div></header>

    <section className="room-member-profile-hero">
      <div className="room-member-profile-avatar" aria-hidden="true">{member.name.slice(0, 1)}</div>
      <div><div className="room-member-name"><h2>{member.name}</h2>{member.isOwner && <span>{t.roomMembers.ownerBadge}</span>}</div><strong>{member.role}</strong><p>{member.bio}</p></div>
    </section>

    <section className="room-member-profile-section"><h2><CodeXml />{t.roomMembers.skills}</h2><div className="profile-chip-list is-purple">{member.skillTags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
    <section className="room-member-profile-section"><h2><Users />{t.roomMembers.interests}</h2><div className="profile-chip-list">{member.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></section>
    <section className="room-member-profile-section"><h2><MessageCircle />{t.roomMembers.collabStyle}</h2><p>{member.collabStyle}</p></section>
    <section className="room-member-profile-section"><h2><BriefcaseBusiness />{t.roomMembers.projects}</h2><ul>{member.projectHistory.map((project) => <li key={project}>{project}</li>)}</ul></section>

    {(member.socialLinks?.blog || member.socialLinks?.instagram || member.socialLinks?.github) && <section className="room-member-profile-section"><h2><Link2 />{t.roomMembers.links}</h2><div className="profile-link-list">
      {member.socialLinks.blog && <a href={member.socialLinks.blog} target="_blank" rel="noreferrer"><Link2 />{t.roomMembers.blog}<ExternalLink /></a>}
      {member.socialLinks.instagram && <a href={member.socialLinks.instagram} target="_blank" rel="noreferrer"><AtSign />{t.roomMembers.instagram}<ExternalLink /></a>}
      {member.socialLinks.github && <a href={member.socialLinks.github} target="_blank" rel="noreferrer"><CodeXml />GitHub<ExternalLink /></a>}
    </div></section>}
  </div>;
}
