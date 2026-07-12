import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';

export function IntroScreen() {
  const { t } = useTranslation();

  return (
    <main className="intro-screen">
      <div className="intro-opening" aria-hidden="true">
        <img src="/icon_white.png" alt="" className="intro-opening-logo" />
      </div>

      <div className="intro-color-panel" aria-hidden="true" />

      <div className="intro-welcome">
        <img src="/logo.png" alt="연" className="intro-welcome-logo" />

        <div className="intro-actions">
          <Link to="/signup" className="intro-signup-button">
            {t.auth.signup.submit}
          </Link>
          <Link to="/login" className="intro-login-button">
            {t.auth.login.submit}
          </Link>
        </div>
      </div>
    </main>
  );
}
