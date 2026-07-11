import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecommendationActionMutation } from '../../hooks/useRecommendationAction';
import { useUiStore } from '../../store/uiStore';
import { ApiError } from '../../api/client';
import { useTranslation } from '../../i18n';

// ActionButtons.tsx — FR-6.3/6.4, EC-3 중복 액션 방지
export function ActionButtons({ recommendationId }: { recommendationId: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pushToast = useUiStore((s) => s.pushToast);
  const mutation = useRecommendationActionMutation();
  const [resolved, setResolved] = useState(false);

  const handleAction = async (action: 'accept' | 'reject') => {
    try {
      await mutation.mutateAsync({ id: recommendationId, action });
      setResolved(true);
      if (action === 'accept') {
        pushToast(t.recommendationDetail.acceptSuccess, 'success');
        navigate('/matches');
      } else {
        pushToast(t.recommendationDetail.rejectSuccess, 'info');
        navigate('/');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        pushToast(t.recommendationDetail.alreadyResolved, 'error');
        setResolved(true);
        return;
      }
      pushToast(t.common.genericError, 'error');
    }
  };

  const disabled = mutation.isPending || resolved;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => handleAction('reject')}
        disabled={disabled}
        className="flex-1 rounded-lg border border-neutral-300 py-3 text-sm text-neutral-600 transition-colors hover:border-neutral-400 disabled:opacity-40"
      >
        {t.recommendationDetail.reject}
      </button>
      <button
        type="button"
        onClick={() => handleAction('accept')}
        disabled={disabled}
        className="flex-1 rounded-lg bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {t.recommendationDetail.accept}
      </button>
    </div>
  );
}
