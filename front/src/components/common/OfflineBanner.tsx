import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';

// EC-5: 네트워크 오류 시 오프라인 배너 처리
export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div role="status" className="w-full bg-red-500 px-4 py-2 text-center text-xs font-semibold text-white">
      {t.common.offlineBanner}
    </div>
  );
}
