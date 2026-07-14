import { CalendarDays, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Opportunity } from '../../types/domain';
import { useTranslation } from '../../i18n';

function getDeadlineLabel(deadline: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${deadline}T00:00:00`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return '마감';
  if (days === 0) return 'D-Day';
  return `D-${days}`;
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const { t } = useTranslation();
  return <Link to={`/opportunities/${opportunity.id}`} className="opportunity-card">
    <img src={opportunity.imageUrl} alt="" loading="lazy" />
    <div className="opportunity-card-content">
      <div className="opportunity-card-topline"><span>{t.opportunities.types[opportunity.type]}</span><strong className={`is-${opportunity.status}`}>{t.opportunities.status[opportunity.status]}</strong></div>
      <h2>{opportunity.title}</h2>
      <p>{opportunity.organizer}</p>
      <div className="opportunity-card-tags">{opportunity.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="opportunity-card-deadline"><CalendarDays /><span>{opportunity.deadline.replaceAll('-', '.')}</span><strong>{getDeadlineLabel(opportunity.deadline)}</strong><ChevronRight /></div>
    </div>
  </Link>;
}
