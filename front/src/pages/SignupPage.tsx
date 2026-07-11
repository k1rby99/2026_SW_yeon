import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../hooks/useAuth';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';
import { Logo } from '../components/common/Logo';

interface SignupFormValues {
  email: string;
  password: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pushToast = useUiStore((s) => s.pushToast);
  const signup = useSignup();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>();

  const onSubmit = async (values: SignupFormValues) => {
    setSubmitError(null);
    try {
      await signup.mutateAsync(values);
      navigate('/onboarding', { replace: true });
    } catch {
      setSubmitError(t.auth.signup.failed);
      pushToast(t.auth.signup.failed, 'error');
    }
  };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(232,146,124,0.12),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(91,110,225,0.12),transparent_55%)] px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" className="shadow-[0_8px_30px_-8px_rgba(91,110,225,0.35)]" />
          <p className="text-xs text-neutral-500">{t.auth.signup.title}</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_40px_-16px_rgba(27,27,58,0.15)]"
        >
          <input
            type="email"
            placeholder={t.auth.signup.emailPlaceholder}
            aria-label={t.auth.signup.emailPlaceholder}
            className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20"
            {...register('email', { required: true })}
          />
          {errors.email && <p className="text-xs text-red-500">{t.auth.signup.emailRequired}</p>}

          <input
            type="password"
            placeholder={t.auth.signup.passwordPlaceholder}
            aria-label={t.auth.signup.passwordPlaceholder}
            className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20"
            {...register('password', { required: true, minLength: 8 })}
          />
          {errors.password && <p className="text-xs text-red-500">{t.auth.signup.passwordMinLength}</p>}

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-xl bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-center text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? t.auth.signup.submitting : t.auth.signup.submit}
          </button>
        </form>

        <Link to="/login" className="text-center text-xs text-neutral-500 underline">
          {t.auth.signup.goToLogin}
        </Link>
      </div>
    </div>
  );
}
