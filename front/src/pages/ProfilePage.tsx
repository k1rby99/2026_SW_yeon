import { CodeXml, ExternalLink, Link2, Settings2, AtSign } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ProfileForm, type ProfileFormValues } from '../components/profile/ProfileForm';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

export function ProfilePage() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const pushToast = useUiStore((state) => state.pushToast);
  if (isLoading || !profile) return <LoadingSpinner label={t.profilePage.loading} />;

  const save = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({ interests: values.interests, skillTags: values.skillTags, projectHistory: values.projectHistory ? [values.projectHistory] : [], collabStyle: values.collabStyle });
      pushToast(t.profilePage.saveSuccess, 'success');
    } catch { pushToast(t.profilePage.saveFailed, 'error'); }
  };

  return (
    <div className="tab-page profile-page">
      <header className="profile-hero"><div className="profile-avatar">나</div><div><p>{t.profilePage.eyebrow}</p><h1>{t.profilePage.defaultName}</h1><span>{profile.bio || t.profilePage.defaultBio}</span></div></header>
      <div className="profile-stats"><div><strong>{profile.interests.length}</strong><span>{t.profilePage.interests}</span></div><div><strong>{profile.skillTags.length}</strong><span>{t.profilePage.strengths}</span></div><div><strong>{profile.projectHistory.length}</strong><span>{t.profilePage.connections}</span></div></div>
      <section className="profile-section"><h2>{t.profilePage.interests}</h2><div className="profile-chip-list">{profile.interests.map((item) => <span key={item}>{item}</span>)}</div></section>
      <section className="profile-section"><h2>{t.profilePage.strengths}</h2><div className="profile-chip-list is-purple">{profile.skillTags.map((item) => <span key={item}>{item}</span>)}</div></section>
      {(profile.socialLinks?.blog || profile.socialLinks?.instagram || profile.socialLinks?.github) && <section className="profile-section"><h2>{t.profilePage.links}</h2><div className="profile-link-list">
        {profile.socialLinks.blog && <a href={profile.socialLinks.blog}><Link2 />블로그 · 포트폴리오<ExternalLink /></a>}
        {profile.socialLinks.instagram && <a href={profile.socialLinks.instagram}><AtSign />인스타그램<ExternalLink /></a>}
        {profile.socialLinks.github && <a href={profile.socialLinks.github}><CodeXml />GitHub<ExternalLink /></a>}
      </div></section>}
      <details className="profile-edit-panel"><summary><Settings2 aria-hidden="true" />{t.profilePage.edit}</summary><ProfileForm mode="edit" initialValues={{ interests: profile.interests, skillTags: profile.skillTags, projectHistory: profile.projectHistory[0] ?? '', collabStyle: profile.collabStyle }} onSubmit={save} submitting={updateProfile.isPending} /></details>
    </div>
  );
}
