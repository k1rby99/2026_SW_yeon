import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useTranslation } from '../i18n';

// front_request.md FR-2.4: 온보딩 미완료 시 다른 화면 접근 차단
export function OnboardingGuard() {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile();

  if (isLoading) return <LoadingSpinner label={t.guard.checkingProfile} />;
  if (!profile || !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}
