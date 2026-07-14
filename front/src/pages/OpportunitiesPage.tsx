import { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { OpportunityCard } from '../components/opportunity/OpportunityCard';
import { useOpportunities } from '../hooks/useOpportunities';
import { useTranslation } from '../i18n';
import type { OpportunityType } from '../types/domain';

type Filter = 'all' | OpportunityType;

export function OpportunitiesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useOpportunities();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => (data?.items ?? []).filter((item) => {
    const matchesType = filter === 'all' || item.type === filter;
    const normalized = query.trim().toLowerCase();
    const matchesQuery = !normalized || [item.title, item.organizer, item.category, ...item.tags].some((value) => value.toLowerCase().includes(normalized));
    return matchesType && matchesQuery;
  }), [data?.items, filter, query]);

  return <div className="room-workspace-page opportunities-page">
    <header className="room-workspace-header"><Link to="/" aria-label={t.common.back}><ArrowLeft /></Link><div><span>{t.opportunities.eyebrow}</span><h1>{t.opportunities.title}</h1></div></header>
    <label className="opportunity-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.opportunities.searchPlaceholder} /></label>
    <div className="opportunity-filters" role="group" aria-label={t.opportunities.filterLabel}>{(['all', 'contest', 'announcement'] as const).map((value) => <button key={value} type="button" className={filter === value ? 'is-selected' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{t.opportunities.filters[value]}</button>)}</div>
    <div className="opportunity-list-heading"><strong>{t.opportunities.resultTitle}</strong><span>{t.opportunities.resultCount(filtered.length)}</span></div>
    {isLoading ? <LoadingSpinner /> : <div className="opportunity-list">{filtered.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}{filtered.length === 0 && <p className="room-workspace-empty">{t.opportunities.empty}</p>}</div>}
  </div>;
}
