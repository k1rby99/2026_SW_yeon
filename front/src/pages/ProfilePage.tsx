import { useEffect, useState } from 'react';
import { ProfileForm, type ProfileFormValues } from '../components/profile/ProfileForm';
import { VisibilityToggle } from '../components/profile/VisibilityToggle';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';
import type { Profile } from '../types/domain';

// S3 마이 프로필 — FR-3.1~3.3
export function ProfilePage() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const pushToast = useUiStore((s) => s.pushToast);
  const [visibility, setVisibility] = useState<Profile['visibilityScope']>('public');

  useEffect(() => {
    if (profile) setVisibility(profile.visibilityScope);
  }, [profile]);

  if (isLoading || !profile) return <LoadingSpinner label={t.profilePage.loading} />;

  const handleSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({
        interests: values.interests,
        skillTags: values.skillTags,
        projectHistory: values.projectHistory ? [values.projectHistory] : [],
        collabStyle: values.collabStyle,
        visibilityScope: visibility,
      });
      pushToast(t.profilePage.saveSuccess, 'success');
    } catch {
      pushToast(t.profilePage.saveFailed, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-8 md:mx-auto md:max-w-xl md:px-10 md:py-10">
      <h1 className="text-lg font-bold text-brand-navy">{t.profilePage.title}</h1>

      <VisibilityToggle value={visibility} onChange={setVisibility} />

      <ProfileForm
        mode="edit"
        initialValues={{
          interests: profile.interests,
          skillTags: profile.skillTags,
          projectHistory: profile.projectHistory[0] ?? '',
          collabStyle: profile.collabStyle,
        }}
        onSubmit={handleSubmit}
        submitting={updateProfile.isPending}
      />
    </div>
  );
}
