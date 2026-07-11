import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoalForm } from '../components/goal/GoalForm';
import { GoalPipelineStatus } from '../components/goal/GoalPipelineStatus';
import { useCreateGoal, useGoalHistory } from '../hooks/useGoals';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

// S4 목표 등록 — front_request.md FR-4.1~4.3
export function GoalsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createGoal = useCreateGoal();
  const { data: history } = useGoalHistory();
  const pushToast = useUiStore((s) => s.pushToast);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const handleSubmit = async (values: { text: string; category: string }) => {
    try {
      const goal = await createGoal.mutateAsync(values);
      setActiveGoalId(goal.id);
    } catch {
      pushToast(t.goalsPage.createFailed, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-8 md:mx-auto md:max-w-xl md:px-10 md:py-10">
      <h1 className="text-lg font-bold text-brand-navy">{t.goalsPage.title}</h1>

      <GoalForm onSubmit={handleSubmit} submitting={createGoal.isPending} />

      {activeGoalId && (
        <GoalPipelineStatus
          goalId={activeGoalId}
          onRetry={() => setActiveGoalId(null)}
          onDone={() => navigate('/')}
        />
      )}

      {history && history.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-neutral-600">{t.goalsPage.historyTitle}</p>
          {history.map((g) => (
            <div key={g.id} className="rounded-lg border border-neutral-200 p-3 text-xs text-neutral-600">
              {g.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
