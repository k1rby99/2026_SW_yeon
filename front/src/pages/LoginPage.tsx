import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';
import { Logo } from '../components/common/Logo';

interface LoginFormValues {
  email: string;
  password: string;
}

// S1 로그인 — Architecture.md 3.1/3.2, front_request.md IA S1
export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pushToast = useUiStore((s) => s.pushToast);
  const login = useLogin();
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    <div className="flex min-h-svh flex-col justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(232,146,124,0.12),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(91,110,225,0.12),transparent_55%)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" className="shadow-[0_8px_30px_-8px_rgba(91,110,225,0.35)]" />
          <p className="text-xs text-neutral-500">{t.app.tagline}</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_40px_-16px_rgba(27,27,58,0.15)]"
        >
          <input
            type="email"
            placeholder={t.auth.login.emailPlaceholder}
            aria-label={t.auth.login.emailPlaceholder}
            className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20"
            {...register('email', { required: true })}
          />
          {errors.email && <p className="text-xs text-red-500">{t.auth.login.emailRequired}</p>}

          <input
            type="password"
            placeholder={t.auth.login.passwordPlaceholder}
            aria-label={t.auth.login.passwordPlaceholder}
            className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20"
            {...register('password', { required: true })}
          />
          {errors.password && <p className="text-xs text-red-500">{t.auth.login.passwordRequired}</p>}

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-xl bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-center text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? t.auth.login.submitting : t.auth.login.submit}
          </button>
        </form>

        <Link to="/signup" className="text-center text-xs text-neutral-500 underline">
          {t.auth.login.goToSignup}
        </Link>
      </div>
    </div>
  );
}
