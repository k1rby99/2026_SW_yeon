import { useNavigate, useParams } from 'react-router-dom';
import { FeedbackForm } from '../components/feedback/FeedbackForm';
import { useSubmitFeedback } from '../hooks/useFeedback';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

// S8 협업 피드백
export function FeedbackPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const submitFeedback = useSubmitFeedback();
  const pushToast = useUiStore((s) => s.pushToast);

  const handleSubmit = async (values: { satisfactionScore: number; comment: string }) => {
    if (!id) return;
    try {
      await submitFeedback.mutateAsync({ matchId: id, ...values });
      pushToast(t.feedback.submitSuccess, 'success');
      navigate('/matches');
    } catch {
      pushToast(t.feedback.submitFailed, 'error');
    }
  };

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-end">
      <FeedbackForm onSubmit={handleSubmit} submitting={submitFeedback.isPending} />
    </div>
  );
}
