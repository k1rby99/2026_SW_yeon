import { useState } from 'react';
import { TagInput } from './TagInput';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../i18n';

export interface ProfileFormValues {
  interests: string[];
  skillTags: string[];
  projectHistory: string;
  collabStyle: string;
}

const TOTAL_STEPS = 4;

// ProfileForm.tsx — 온보딩(S2) 스테퍼 + 마이프로필(S3) 단일 폼 공용 컴포넌트
export function ProfileForm({
  mode,
  initialValues,
  onSubmit,
  submitting,
}: {
  mode: 'onboarding' | 'edit';
  initialValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ProfileFormValues>({
    interests: initialValues?.interests ?? [],
    skillTags: initialValues?.skillTags ?? [],
    projectHistory: initialValues?.projectHistory ?? '',
    collabStyle: initialValues?.collabStyle ?? '',
  });

  const step = useUiStore((s) => s.onboardingStep);
  const setStep = useUiStore((s) => s.setOnboardingStep);

  if (mode === 'edit') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
        className="flex flex-col gap-5"
      >
        <TagInput
          label={t.profileForm.interests}
          value={values.interests}
          onChange={(interests) => setValues((v) => ({ ...v, interests }))}
          suggestions={t.profileForm.interestSuggestions}
        />
        <TagInput
          label={t.profileForm.skills}
          value={values.skillTags}
          onChange={(skillTags) => setValues((v) => ({ ...v, skillTags }))}
          suggestions={t.profileForm.skillSuggestions}
        />
        <label className="flex flex-col gap-2 text-xs font-semibold text-neutral-600">
          {t.profileForm.projectHistory}
          <textarea
            value={values.projectHistory}
            onChange={(e) => setValues((v) => ({ ...v, projectHistory: e.target.value }))}
            className="rounded-lg border border-neutral-300 p-3 text-xs outline-none focus:border-brand-indigo"
            rows={3}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-center text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? t.common.saving : t.common.save}
        </button>
      </form>
    );
  }

  const goNext = () => setStep(Math.min(step + 1, TOTAL_STEPS));
  const goPrev = () => setStep(Math.max(step - 1, 1));

  const handleFinish = () => {
    onSubmit(values);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < step ? 'bg-gradient-to-r from-brand-coral to-brand-indigo' : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500">{t.profileForm.stepIndicator(step, TOTAL_STEPS)}</p>

      {step === 1 && (
        <TagInput
          label={t.profileForm.interestsStepLabel}
          value={values.interests}
          onChange={(interests) => setValues((v) => ({ ...v, interests }))}
          suggestions={t.profileForm.interestSuggestions}
        />
      )}

      {step === 2 && (
        <TagInput
          label={t.profileForm.skillsStepLabel}
          value={values.skillTags}
          onChange={(skillTags) => setValues((v) => ({ ...v, skillTags }))}
          suggestions={t.profileForm.skillSuggestions}
        />
      )}

      {step === 3 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-600" htmlFor="project-history">
            {t.profileForm.projectHistory}
          </label>
          <textarea
            id="project-history"
            value={values.projectHistory}
            onChange={(e) => setValues((v) => ({ ...v, projectHistory: e.target.value }))}
            className="rounded-lg border border-neutral-300 p-3 text-xs outline-none focus:border-brand-indigo"
            rows={4}
            placeholder={t.profileForm.projectHistoryPlaceholder}
          />
          {/* FR-2.3: 콜드스타트 대응 안내 문구 (Architecture.md 6장 근거) */}
          <p className="rounded-lg bg-brand-coral/10 p-3 text-xs text-brand-navy">
            {t.profileForm.coldStartHint}
          </p>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-neutral-600">{t.profileForm.collabStyleLabel}</p>
          <div className="flex flex-col gap-2">
            {t.profileForm.collabStyles.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setValues((v) => ({ ...v, collabStyle: style }))}
                aria-pressed={values.collabStyle === style}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  values.collabStyle === style
                    ? 'border-brand-indigo/40 bg-gradient-to-r from-brand-coral/10 to-brand-indigo/10 font-bold text-brand-navy'
                    : 'border-neutral-300 text-neutral-600'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1}
          className="flex-1 rounded-lg border border-neutral-300 py-3 text-sm text-neutral-600 disabled:opacity-40"
        >
          {t.profileForm.prev}
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            className="flex-[2] rounded-lg bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90"
          >
            {t.profileForm.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={submitting || !values.collabStyle}
            className="flex-[2] rounded-lg bg-gradient-to-r from-brand-coral to-brand-indigo py-3 text-sm font-bold text-white shadow-[0_6px_16px_-8px_rgba(91,110,225,0.6)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t.common.saving : t.profileForm.finish}
          </button>
        )}
      </div>
    </div>
  );
}
