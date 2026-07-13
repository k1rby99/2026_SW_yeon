import { useState } from 'react';
import { ArrowLeft, Check, Send, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useInviteCandidate, useRoom, useRoomCandidates } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

export function RoomInvitePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: room } = useRoom(id);
  const { data: candidates, isLoading } = useRoomCandidates(id);
  const invite = useInviteCandidate(id);
  const pushToast = useUiStore((state) => state.pushToast);
  const [message, setMessage] = useState<string>(t.roomManagement.defaultInviteMessage);
  const [selected, setSelected] = useState<string | null>(null);

  const send = async (userId: string) => {
    try {
      await invite.mutateAsync({ userId, message });
      setSelected(null);
      pushToast(t.roomManagement.inviteSent, 'success');
    } catch {
      pushToast(t.roomManagement.inviteFailed, 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  return <div className="room-workspace-page">
    <header className="room-workspace-header"><Link to={`/rooms/${id}`} aria-label={t.common.back}><ArrowLeft /></Link><div><span>{room?.title}</span><h1>{t.roomManagement.inviteTitle}</h1></div></header>
    <div className="room-workspace-intro"><Sparkles /><div><strong>{t.roomManagement.inviteIntroTitle}</strong><span>{t.roomManagement.inviteIntroDescription}</span></div></div>
    <div className="room-candidate-list">
      {candidates?.map((candidate) => <article className="room-candidate-card" key={candidate.id}>
        <div className="room-candidate-avatar" aria-hidden="true">{candidate.name.slice(0, 1)}</div>
        <div className="room-candidate-content">
          <div className="room-candidate-heading"><div><h2>{candidate.name}</h2><span>{candidate.role}</span></div><strong>{candidate.matchScore}%</strong></div>
          <p>{candidate.bio}</p>
          <div className="room-candidate-tags">{candidate.skillTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="room-match-reason"><Sparkles /><span>{candidate.reason}</span></div>
          {selected === candidate.id && <div className="room-invite-composer"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} /><div><button type="button" onClick={() => setSelected(null)}>{t.common.close}</button><button type="button" disabled={invite.isPending} onClick={() => send(candidate.id)}><Send />{t.roomManagement.sendInvite}</button></div></div>}
          {candidate.invitationStatus === 'pending' ? <button className="room-candidate-invited" type="button" disabled><Check />{t.roomManagement.invited}</button> : selected !== candidate.id && <button className="room-candidate-invite" type="button" onClick={() => setSelected(candidate.id)}><Send />{t.roomManagement.inviteCandidate}</button>}
        </div>
      </article>)}
    </div>
  </div>;
}
