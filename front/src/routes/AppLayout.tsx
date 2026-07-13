import { NavLink, Outlet } from 'react-router-dom';
import { Handshake, Home, Target, UserRound } from 'lucide-react';
import { ErrorToast } from '../components/common/ErrorToast';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { Logo } from '../components/common/Logo';
import { useTranslation } from '../i18n';

// 모바일: 하단 탭바(기존 와이어프레임 그대로) / 데스크톱(md+): 좌측 사이드바로 전환
// front_request.md §9 반응형 요구사항 대응 — 앱 셸 자체를 모바일 폭(max-w-md)에 고정하지 않는다.
export function AppLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '/', label: t.nav.home, icon: Home },
    { to: '/goals', label: t.nav.goals, icon: Target },
    { to: '/matches', label: t.nav.matches, icon: Handshake },
    { to: '/profile', label: t.nav.profile, icon: UserRound },
  ];

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col bg-white md:flex-row">
      <nav className="hidden w-56 flex-shrink-0 flex-col gap-1 border-r border-neutral-200 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Logo size="sm" className="shadow-sm" />
          <span className="font-display text-lg text-brand-navy">{t.app.name}</span>
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-brand-indigo bg-gradient-to-r from-brand-coral/10 to-brand-indigo/10 text-brand-indigo'
                  : 'border-transparent text-neutral-500 hover:text-brand-navy'
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </NavLink>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="app-bottom-nav md:hidden" aria-label="하단 메뉴">
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
