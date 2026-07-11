import { NavLink, Outlet } from 'react-router-dom';
import { ErrorToast } from '../components/common/ErrorToast';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { Logo } from '../components/common/Logo';
import { useTranslation } from '../i18n';

// 모바일: 하단 탭바(기존 와이어프레임 그대로) / 데스크톱(md+): 좌측 사이드바로 전환
// front_request.md §9 반응형 요구사항 대응 — 앱 셸 자체를 모바일 폭(max-w-md)에 고정하지 않는다.
export function AppLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '/', label: t.nav.home },
    { to: '/goals', label: t.nav.goals },
    { to: '/matches', label: t.nav.matches },
    { to: '/profile', label: t.nav.profile },
  ];

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col bg-surface md:flex-row">
      <nav className="hidden w-56 flex-shrink-0 flex-col gap-1 border-r border-neutral-200 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Logo size="sm" className="shadow-sm" />
          <span className="font-display text-lg text-brand-navy">{t.app.name}</span>
        </div>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-brand-indigo bg-gradient-to-r from-brand-coral/10 to-brand-indigo/10 text-brand-indigo'
                  : 'border-transparent text-neutral-500 hover:text-brand-navy'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
                isActive ? 'text-brand-indigo' : 'text-neutral-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`h-1 w-1 rounded-full transition-opacity ${
                    isActive ? 'bg-gradient-to-r from-brand-coral to-brand-indigo opacity-100' : 'opacity-0'
                  }`}
                />
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <ErrorToast />
    </div>
  );
}
