import { useEffect } from 'react';
import { useGoal } from '../../hooks/useGoals';
import { useTranslation } from '../../i18n';

// GoalPipelineStatus.tsx — 2초 폴링, idle/processing/done/failed(+timeout) 상태머신, EC-1 재시도
export function GoalPipelineStatus({
  goalId,
  onRetry,
  onDone,
}: {
  goalId: string;
  onRetry: () => void;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const { data: goal, isLoading, isTimedOut } = useGoal(goalId);

  useEffect(() => {
    if (goal?.status === 'completed') onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.status]);

  if (isLoading || !goal) {
    return <p className="text-xs text-neutral-400">{t.goalPipeline.checking}</p>;
  }

  if (goal.status === 'failed' || isTimedOut) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-red-300 p-4 text-center">
        <p className="text-xs text-red-500">
          {isTimedOut ? t.goalPipeline.timedOut : t.goalPipeline.failed}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-500"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  const activeStepIndex =
    goal.status === 'completed' ? t.goalPipeline.steps.length : Math.min(t.goalPipeline.steps.length - 1, 1);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
      <p className="text-[10px] font-mono uppercase tracking-wide text-neutral-400">
        {t.goalPipeline.pollingLabel}
      </p>
      {t.goalPipeline.steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              i < activeStepIndex
                ? 'bg-gradient-to-r from-brand-coral to-brand-indigo'
                : i === activeStepIndex
                  ? 'animate-pulse bg-brand-indigo'
                  : 'border border-neutral-300'
            }`}
          />
          <span className="text-xs text-neutral-600">{step}</span>
        </div>
      ))}
      {goal.status === 'completed' && (
        <p className="text-xs font-semibold text-brand-indigo">{t.goalPipeline.done}</p>
      )}
    </div>
  );
}
