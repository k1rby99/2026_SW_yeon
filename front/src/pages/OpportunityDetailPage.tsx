import { ArrowLeft, Building2, CalendarDays, ExternalLink, Sparkles, UserRoundCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useOpportunity } from '../hooks/useOpportunities';
import { useTranslation } from '../i18n';

export function OpportunityDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: opportunity, isLoading } = useOpportunity(id);
  if (isLoading || !opportunity) return <LoadingSpinner />;

  return <div className="room-workspace-page opportunity-detail-page">
    <header className="room-workspace-header"><Link to="/opportunities" aria-label={t.common.back}><ArrowLeft /></Link><div><span>{t.opportunities.types[opportunity.type]}</span><h1>{t.opportunities.detailTitle}</h1></div></header>
    <img className="opportunity-detail-image" src={opportunity.imageUrl} alt="" />
    <section className="opportunity-detail-hero"><div><span>{opportunity.category}</span><strong>{t.opportunities.status[opportunity.status]}</strong></div><h2>{opportunity.title}</h2><p>{opportunity.summary}</p><div className="opportunity-detail-tags">{opportunity.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></section>
    <dl className="opportunity-detail-info"><div><dt><Building2 />{t.opportunities.organizer}</dt><dd>{opportunity.organizer}</dd></div><div><dt><CalendarDays />{t.opportunities.period}</dt><dd>{opportunity.period}</dd></div><div><dt><UserRoundCheck />{t.opportunities.eligibility}</dt><dd>{opportunity.eligibility}</dd></div></dl>
    <section className="opportunity-detail-section"><h2>{t.opportunities.benefits}</h2><ul>{opportunity.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></section>
    <div className="opportunity-detail-actions"><Link to="/goals" state={{ opportunity }}><Sparkles />{t.opportunities.findConnection}</Link><a href={opportunity.officialUrl} target="_blank" rel="noreferrer">{t.opportunities.openOfficial}<ExternalLink /></a></div>
  </div>;
}
