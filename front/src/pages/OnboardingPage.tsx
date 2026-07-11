import { useNavigate } from 'react-router-dom';
import { ProfileForm, type ProfileFormValues } from '../components/profile/ProfileForm';
import { useCreateProfile } from '../hooks/useProfile';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

// S2 온보딩 — front_request.md FR-2.1~2.4
export function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createProfile = useCreateProfile();
  const pushToast = useUiStore((s) => s.pushToast);

  const handleSubmit = async (values: ProfileFormValues) => {
    try {
      await createProfile.mutateAsync({
        interests: values.interests,
        skillTags: values.skillTags,
        projectHistory: values.projectHistory ? [values.projectHistory] : [],
        collabStyle: values.collabStyle,
        visibilityScope: 'public',
      });
      navigate('/', { replace: true });
    } catch {
      pushToast(t.onboarding.saveFailed, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-8 md:mx-auto md:max-w-xl md:px-10 md:py-10">
      <div>
        <h1 className="text-lg font-bold text-brand-navy">{t.onboarding.title}</h1>
        <p className="mt-1 text-xs text-neutral-500">{t.onboarding.subtitle}</p>
      </div>
      <ProfileForm mode="onboarding" onSubmit={handleSubmit} submitting={createProfile.isPending} />
    </div>
  );
}
