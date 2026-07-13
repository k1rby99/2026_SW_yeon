import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useRoom, useRoomMessages, useSendRoomMessage } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

export function RoomChatPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: room } = useRoom(id);
  const { data, isLoading } = useRoomMessages(id);
  const sendMessage = useSendRoomMessage(id);
  const pushToast = useUiStore((state) => state.pushToast);
  const [content, setContent] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.items.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      await sendMessage.mutateAsync(content.trim());
      setContent('');
    } catch {
      pushToast(t.roomManagement.messageFailed, 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  return <div className="room-chat-page">
    <header className="room-chat-header"><Link to={`/rooms/${id}`} aria-label={t.common.back}><ArrowLeft /></Link><div><h1>{room?.title}</h1><span><Users />{t.roomManagement.chatMembers(room?.memberCount ?? 0)}</span></div></header>
    <div className="room-chat-notice">{room?.notice || t.roomManagement.defaultChatNotice}</div>
    <div className="room-chat-messages" aria-live="polite">
      {data?.items.map((message) => {
        const mine = message.sender.id === 'user-me';
        return <article key={message.id} className={mine ? 'is-mine' : ''}><span>{mine ? t.roomManagement.me : message.sender.name}</span><div><p>{message.content}</p><time>{new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}</time></div></article>;
      })}
      {data?.items.length === 0 && <p className="room-workspace-empty">{t.roomManagement.noMessages}</p>}
      <div ref={endRef} />
    </div>
    <form className="room-chat-composer" onSubmit={submit}><input value={content} onChange={(event) => setContent(event.target.value)} placeholder={t.roomManagement.messagePlaceholder} aria-label={t.roomManagement.messagePlaceholder} /><button type="submit" disabled={!content.trim() || sendMessage.isPending} aria-label={t.roomManagement.sendMessage}><Send /></button></form>
  </div>;
}
