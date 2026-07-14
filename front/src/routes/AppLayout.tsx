import { NavLink, Outlet } from 'react-router-dom';
import { Handshake, Home, Target, UserRound } from 'lucide-react';
import { ErrorToast } from '../components/common/ErrorToast';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { useTranslation } from '../i18n';

// 데스크톱에서도 모바일 앱과 동일한 폭과 하단 탭 구조를 유지한다.
export function AppLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '/', label: t.nav.home, icon: Home },
    { to: '/goals', label: t.nav.goals, icon: Target },
    { to: '/matches', label: t.nav.matches, icon: Handshake },
    { to: '/profile', label: t.nav.profile, icon: UserRound },
  ];

  return (
    <div className="flex min-h-svh w-full flex-col bg-white">
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>
      </div>

      <nav className="app-bottom-nav" aria-label="하단 메뉴">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className="app-bottom-nav-link"
          >
            {({ isActive }) => (
              <>
                <span className={`app-bottom-nav-icon ${isActive ? 'is-active' : ''}`}>
                  <Icon aria-hidden="true" />
                </span>
                <span className={isActive ? 'is-active' : ''}>{tab.label}</span>
              </>
            )}
          </NavLink>
          );
        })}
      </nav>

      <ErrorToast />
    </div>
  );
}
