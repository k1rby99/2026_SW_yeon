import { useState, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pushToast = useUiStore((s) => s.pushToast);
  const login = useLogin();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      const result = await login.mutateAsync(values);
      navigate(result.isNewUser ? '/onboarding' : '/', { replace: true });
    } catch {
      setSubmitError(t.auth.login.failed);
      pushToast(t.auth.login.failed, 'error');
    }
  };

  return (
    <main className="signup-page auth-login-page">
      <div className="signup-shell auth-login-shell">
        <header className="signup-header signup-reveal" style={{ '--delay': '40ms' } as CSSProperties}>
          <Link to="/welcome" aria-label="처음 화면으로 이동">
            <img src="/icon.png" alt="연" className="signup-logo" />
          </Link>
          <h1>{t.auth.login.title}</h1>
          <p>{t.auth.login.subtitle}</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="signup-form" noValidate>
          <label className="signup-field signup-reveal" style={{ '--delay': '120ms' } as CSSProperties}>
            <span>{t.auth.login.emailLabel}</span>
            <div className="signup-input-wrap">
              <Mail aria-hidden="true" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t.auth.login.emailPlaceholder}
                aria-invalid={!!errors.email}
                {...register('email', { required: t.auth.login.emailRequired })}
              />
            </div>
            {errors.email && <small role="alert">{errors.email.message}</small>}
          </label>

          <label className="signup-field signup-reveal" style={{ '--delay': '200ms' } as CSSProperties}>
            <span>{t.auth.login.passwordLabel}</span>
            <div className="signup-input-wrap">
              <LockKeyhole aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t.auth.login.passwordPlaceholder}
                aria-invalid={!!errors.password}
                {...register('password', { required: t.auth.login.passwordRequired })}
              />
              <button
                type="button"
                className="signup-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && <small role="alert">{errors.password.message}</small>}
          </label>

          {submitError && <p className="signup-submit-error" role="alert">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="signup-submit signup-reveal auth-login-submit"
            style={{ '--delay': '280ms' } as CSSProperties}
          >
            {isSubmitting ? t.auth.login.submitting : t.auth.login.submit}
          </button>
        </form>

        <Link
          to="/signup"
          className="signup-login-link signup-reveal"
          style={{ '--delay': '360ms' } as CSSProperties}
        >
          {t.auth.login.goToSignup}
        </Link>
      </div>
    </main>
  );
}
