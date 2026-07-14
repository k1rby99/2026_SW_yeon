import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

const STEP_DURATION_MS = 2800;

interface AnalyzingStateProps {
  title: string;
  steps: readonly string[];
  /** 첫 회만 느리다는 안내를 숨기고 싶을 때 false */
  showHint?: boolean;
}

/**
 * AI 분석이 도는 동안(첫 회 10초 안팎) 보여주는 상태.
 *
 * 스피너 하나로 10초를 버티면 멈춘 것처럼 보인다. 그래서 실제 파이프라인의 단계를
 * 순서대로 짚어 준다. 마지막 단계에서는 멈춰 서서 기다린다(되돌아 반복하지 않는다 —
 * 반복은 진행이 없다는 인상을 준다).
 */
export function AnalyzingState({ title, steps, showHint = true }: AnalyzingStateProps) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= steps.length - 1) return;
    const timer = window.setTimeout(() => setActiveStep((current) => current + 1), STEP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [activeStep, steps.length]);

  return (
    <div className="analyzing-panel" role="status" aria-live="polite">
      <div className="analyzing-heading">
        <span className="analyzing-icon" aria-hidden="true">
          <Sparkles />
        </span>
        <strong>{title}</strong>
      </div>

      <ol className="analyzing-steps">
        {steps.map((step, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <li key={step} className={done ? 'is-done' : active ? 'is-active' : ''}>
              <span className="analyzing-step-mark" aria-hidden="true">
                {done ? <Check /> : <span className="analyzing-step-dot" />}
              </span>
              {step}
            </li>
          );
        })}
      </ol>

      <div className="analyzing-bar" aria-hidden="true">
        <span />
      </div>

      {showHint && <p className="analyzing-hint">{t.analyzing.hint}</p>}
    </div>
  );
}
