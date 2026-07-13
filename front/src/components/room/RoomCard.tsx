import { ArrowUpRight, CalendarDays, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ConnectionRoom } from '../../types/domain';
import { useTranslation } from '../../i18n';

export function RoomCard({ room, compact = false }: { room: ConnectionRoom; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to={`/rooms/${room.id}`} className={`room-card ${compact ? 'is-compact' : ''}`}>
      {room.imageUrl ? (
        <img src={room.imageUrl} alt="" className="room-card-image" />
      ) : (
        <div className="room-card-image room-card-image-fallback" aria-hidden="true" />
      )}
      <div className="room-card-body">
        <div className="room-card-topline">
          <span>{t.rooms.types[room.type]}</span>
          {room.matchScore && <strong>{t.rooms.match} {room.matchScore}%</strong>}
        </div>
        <h3>{room.title}</h3>
        <p>{room.summary}</p>
        <div className="room-card-tags">
          {room.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        <div className="room-card-meta">
          <span><UsersRound aria-hidden="true" /> {room.memberCount}/{room.capacity}</span>
          {room.deadline && <span><CalendarDays aria-hidden="true" /> {room.deadline.slice(5).replace('-', '.')}</span>}
          <ArrowUpRight className="room-card-arrow" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
