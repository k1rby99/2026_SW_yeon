import { useState } from 'react';
import { MatchList } from '../components/match/MatchList';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useMatches } from '../hooks/useMatches';
import { useTranslation } from '../i18n';
import type { MatchStatus } from '../types/domain';

// S7 나의 매칭 — FR-7.1~7.3
export function MatchesPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MatchStatus>('active');
  const { data: matches, isLoading } = useMatches(status);

  return (
    <div className="flex flex-col gap-4 px-6 py-8 md:mx-auto md:max-w-xl md:px-10 md:py-10">
      <h1 className="text-lg font-bold text-brand-navy">{t.matchesPage.title}</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStatus('active')}
          aria-pressed={status === 'active'}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
            status === 'active'
              ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-indigo text-white'
              : 'border-neutral-300 text-neutral-500'
          }`}
        >
          {t.matchesPage.active}
        </button>
        <button
          type="button"
          onClick={() => setStatus('ended')}
          aria-pressed={status === 'ended'}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
            status === 'ended'
              ? 'border-transparent bg-gradient-to-r from-brand-coral to-brand-indigo text-white'
              : 'border-neutral-300 text-neutral-500'
          }`}
        >
          {t.matchesPage.ended}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : matches && matches.length > 0 ? (
        <MatchList matches={matches} />
      ) : (
        <EmptyState title={t.matchesPage.emptyTitle} description={t.matchesPage.emptyDescription} />
      )}
    </div>
  );
}
