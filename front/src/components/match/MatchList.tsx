import { Link } from 'react-router-dom';
import type { MatchRelation } from '../../types/domain';
import { MatchTimeline } from './MatchTimeline';
import { useEndMatch } from '../../hooks/useMatches';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n';

// MatchList.tsx — FR-7.1/7.2, 매칭 종료(종료하기)
export function MatchList({ matches }: { matches: MatchRelation[] }) {
  const { t } = useTranslation();
  const endMatch = useEndMatch();
  const pushToast = useUiStore((s) => s.pushToast);

  const handleEnd = async (matchId: string) => {
    if (!window.confirm(t.matchesPage.endConfirm)) return;
    try {
      await endMatch.mutateAsync(matchId);
      pushToast(t.matchesPage.endSuccess, 'info');
    } catch {
      pushToast(t.matchesPage.endFailed, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {matches.map((match) => (
        <div key={match.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-coral to-brand-indigo p-[2px]">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-navy">
                {match.counterpartSummary.skillTags.slice(0, 2).join(' · ') || t.matchesPage.defaultCounterpart}
              </p>
              <p className="text-[10px] text-neutral-400">
                {match.counterpartSummary.interests.slice(0, 2).join(', ')}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                match.status === 'active'
                  ? 'bg-gradient-to-r from-brand-coral to-brand-indigo text-white'
                  : 'border border-neutral-300 text-neutral-500'
              }`}
            >
              {match.status === 'active' ? t.matchesPage.active : t.matchesPage.ended}
            </span>
          </div>

          {match.status === 'active' && (
            <div className="mt-3 flex gap-2">
              <Link
                to={`/matches/${match.id}/feedback`}
                className="flex-1 rounded-lg border border-neutral-300 py-2 text-center text-xs text-neutral-600"
              >
                {t.matchesPage.giveFeedback}
              </Link>
              <button
                type="button"
                onClick={() => handleEnd(match.id)}
                disabled={endMatch.isPending}
                className="flex-1 rounded-lg border border-neutral-300 py-2 text-center text-xs text-neutral-600 disabled:opacity-50"
              >
                {t.matchesPage.endMatch}
              </button>
            </div>
          )}

          <div className="mt-3">
            <MatchTimeline match={match} />
          </div>
        </div>
      ))}
    </div>
  );
}
