import { useState, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { useSignup } from '../hooks/useAuth';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';

interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  termsAccepted: boolean;
}

export function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pushToast = useUiStore((s) => s.pushToast);
  const signup = useSignup();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>();

  const onSubmit = async ({ name, email, password }: SignupFormValues) => {
    setSubmitError(null);
    try {
      // 이름은 방장·채팅 발신자·멤버 목록에 그대로 노출되므로 가입 시 함께 보낸다.
      await signup.mutateAsync({ name, email, password });
      navigate('/onboarding', { replace: true });
    } catch {
      setSubmitError(t.auth.signup.failed);
      pushToast(t.auth.signup.failed, 'error');
    }
  };

  return (
    <main className="signup-page">
      <div className="signup-shell">
        <header className="signup-header signup-reveal" style={{ '--delay': '40ms' } as CSSProperties}>
          <Link to="/welcome" aria-label="처음 화면으로 이동">
            <img src="/icon.png" alt="연" className="signup-logo" />
          </Link>
          <h1>{t.auth.signup.title}</h1>
          <p>{t.auth.signup.subtitle}</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="signup-form" noValidate>
          <label className="signup-field signup-reveal" style={{ '--delay': '100ms' } as CSSProperties}>
            <span>{t.auth.signup.nameLabel}</span>
            <div className="signup-input-wrap">
              <UserRound aria-hidden="true" />
              <input
                type="text"
                autoComplete="name"
                placeholder={t.auth.signup.namePlaceholder}
                aria-invalid={!!errors.name}
                {...register('name', { required: t.auth.signup.nameRequired })}
              />
            </div>
            {errors.name && <small role="alert">{errors.name.message}</small>}
          </label>

          <label className="signup-field signup-reveal" style={{ '--delay': '160ms' } as CSSProperties}>
            <span>{t.auth.signup.emailLabel}</span>
            <div className="signup-input-wrap">
              <Mail aria-hidden="true" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t.auth.signup.emailPlaceholder}
                aria-invalid={!!errors.email}
                {...register('email', { required: t.auth.signup.emailRequired })}
              />
            </div>
            {errors.email && <small role="alert">{errors.email.message}</small>}
          </label>

          <label className="signup-field signup-reveal" style={{ '--delay': '220ms' } as CSSProperties}>
            <span>{t.auth.signup.passwordLabel}</span>
            <div className="signup-input-wrap">
              <LockKeyhole aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.auth.signup.passwordPlaceholder}
                aria-invalid={!!errors.password}
                {...register('password', {
                  required: t.auth.signup.passwordRequired,
                  minLength: { value: 8, message: t.auth.signup.passwordMinLength },
                })}
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

          <label className="signup-field signup-reveal" style={{ '--delay': '280ms' } as CSSProperties}>
            <span>{t.auth.signup.passwordConfirmLabel}</span>
            <div className="signup-input-wrap">
              <LockKeyhole aria-hidden="true" />
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.auth.signup.passwordConfirmPlaceholder}
                aria-invalid={!!errors.passwordConfirm}
                {...register('passwordConfirm', {
                  required: t.auth.signup.passwordConfirmRequired,
                  validate: (value) => value === watch('password') || t.auth.signup.passwordMismatch,
                })}
              />
              <button
                type="button"
                className="signup-password-toggle"
                onClick={() => setShowPasswordConfirm((value) => !value)}
                aria-label={showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
              >
                {showPasswordConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.passwordConfirm && <small role="alert">{errors.passwordConfirm.message}</small>}
          </label>

          <label className="signup-field signup-reveal" style={{ '--delay': '340ms' } as CSSProperties}>
            <span>{t.auth.signup.phoneLabel}</span>
            <div className="signup-input-wrap">
              <Phone aria-hidden="true" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t.auth.signup.phonePlaceholder}
                aria-invalid={!!errors.phone}
                {...register('phone', {
                  required: t.auth.signup.phoneRequired,
                  pattern: { value: /^[0-9-]{10,13}$/, message: t.auth.signup.phoneInvalid },
                })}
              />
            </div>
            {errors.phone && <small role="alert">{errors.phone.message}</small>}
          </label>

          <div className="signup-reveal" style={{ '--delay': '400ms' } as CSSProperties}>
            <label className="signup-terms">
              <input
                type="checkbox"
                {...register('termsAccepted', { required: t.auth.signup.termsRequired })}
              />
              <span>{t.auth.signup.termsLabel}</span>
            </label>
            {errors.termsAccepted && <small className="signup-terms-error" role="alert">{errors.termsAccepted.message}</small>}
          </div>

          {submitError && <p className="signup-submit-error" role="alert">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="signup-submit signup-reveal"
            style={{ '--delay': '460ms' } as CSSProperties}
          >
            {isSubmitting ? t.auth.signup.submitting : t.auth.signup.complete}
          </button>
        </form>

        <Link
          to="/login"
          className="signup-login-link signup-reveal"
          style={{ '--delay': '520ms' } as CSSProperties}
        >
          {t.auth.signup.goToLogin}
        </Link>
      </div>
    </main>
  );
}
