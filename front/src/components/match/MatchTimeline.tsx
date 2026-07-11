import type { MatchRelation } from '../../types/domain';
import { useTranslation } from '../../i18n';

// MatchTimeline.tsx — FR-7.3
export function MatchTimeline({ match }: { match: MatchRelation }) {
  const { t } = useTranslation();
  const started = new Date(match.startedAt).toLocaleDateString('ko-KR');
  const ended = match.endedAt ? new Date(match.endedAt).toLocaleDateString('ko-KR') : null;

  return (
    <p className="text-[10px] text-neutral-400">
      {started} ──── {match.status === 'active' ? '●' : '■'} ──── {ended ?? t.matchesPage.timelineOngoing}
    </p>
  );
}
