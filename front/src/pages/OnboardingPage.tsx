import { useState, type CSSProperties, type ComponentType } from 'react';
import {
  BadgeDollarSign,
  BookOpenText,
  AtSign,
  ChevronLeft,
  Clapperboard,
  Compass,
  Globe2,
  HouseHeart,
  Landmark,
  Laptop,
  Link2,
  CodeXml,
  Network,
  Rocket,
  Smartphone,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  WalletCards,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { useUiStore } from '../store/uiStore';
import { useCreateProfile } from '../hooks/useProfile';
import { StrengthBubbleCanvas } from '../components/onboarding/StrengthBubbleCanvas';

interface TopicOption {
  id: string;
  label: string;
  icon: ComponentType<{ 'aria-hidden'?: boolean }>;
  tone: string;
}

interface StrengthOption {
  id: string;
  label: string;
}

const TOPICS: TopicOption[] = [
  { id: 'politics', label: '정치', icon: Landmark, tone: 'lilac' },
  { id: 'economy', label: '경제', icon: BadgeDollarSign, tone: 'violet' },
  { id: 'real-estate', label: '부동산', icon: HouseHeart, tone: 'rose' },
  { id: 'investment', label: '재테크', icon: WalletCards, tone: 'indigo' },
  { id: 'society', label: '사회이슈', icon: UsersRound, tone: 'plum' },
  { id: 'global', label: '국제이슈', icon: Globe2, tone: 'blue' },
  { id: 'technology', label: 'IT/과학', icon: Smartphone, tone: 'lavender' },
  { id: 'entertainment', label: '연예/엔터', icon: Star, tone: 'pink' },
  { id: 'movies', label: '영화', icon: Clapperboard, tone: 'purple' },
];

const GOALS: TopicOption[] = [
  { id: 'competition', label: '공모전 팀원 찾기', icon: Trophy, tone: 'violet' },
  { id: 'study', label: '스터디 파트너 찾기', icon: BookOpenText, tone: 'lilac' },
  { id: 'startup', label: '창업 공동창업자 찾기', icon: Rocket, tone: 'rose' },
  { id: 'project', label: '프로젝트 협업', icon: Laptop, tone: 'indigo' },
  { id: 'networking', label: '네트워킹/인맥 확장', icon: Network, tone: 'plum' },
  { id: 'mentoring', label: '커리어 멘토링', icon: Compass, tone: 'blue' },
];

const STRENGTHS: StrengthOption[] = [
  { id: 'frontend', label: '프론트엔드' },
  { id: 'backend', label: '백엔드' },
  { id: 'planning', label: '기획' },
  { id: 'design', label: '디자인' },
  { id: 'data', label: '데이터분석' },
  { id: 'marketing', label: '마케팅' },
  { id: 'presentation', label: '발표' },
  { id: 'finance', label: '재무' },
  { id: 'leadership', label: '리더십' },
];

type StrengthLevel = 1 | 2 | 3;

function getSavedTopics(): string[] {
  try {
    const saved = sessionStorage.getItem('yeon_onboarding_topics');
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pushToast = useUiStore((state) => state.pushToast);
  const createProfile = useCreateProfile();
  const [step, setStep] = useState(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(getSavedTopics);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('yeon_onboarding_goals');
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
    } catch {
      return [];
    }
  });
  const [strengthLevels, setStrengthLevels] = useState<Record<string, StrengthLevel>>({});
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState({ blog: '', instagram: '', github: '' });

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
  };

  const handleTopicNext = () => {
    sessionStorage.setItem('yeon_onboarding_topics', JSON.stringify(selectedTopics));
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((current) =>
      current.includes(goalId)
        ? current.filter((id) => id !== goalId)
        : [...current, goalId],
    );
  };

  const handleGoalNext = () => {
    sessionStorage.setItem('yeon_onboarding_goals', JSON.stringify(selectedGoals));
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addStrength = (strengthId: string) => {
    setStrengthLevels((current) => ({ ...current, [strengthId]: 1 }));
  };

  const growStrength = (strengthId: string) => {
    setStrengthLevels((current) => {
      const level = current[strengthId] ?? 1;
      const nextLevel: StrengthLevel = level === 3 ? 1 : ((level + 1) as StrengthLevel);
      return { ...current, [strengthId]: nextLevel };
    });
  };

  const removeStrength = (strengthId: string) => {
    setStrengthLevels((current) => {
      const next = { ...current };
      delete next[strengthId];
      return next;
    });
  };

  const handleComplete = async () => {
    const topicLabels = TOPICS.filter((item) => selectedTopics.includes(item.id)).map((item) => item.label);
    const goalLabels = GOALS.filter((item) => selectedGoals.includes(item.id)).map((item) => item.label);
    const selectedStrengths = STRENGTHS.filter((item) => strengthLevels[item.id]);
    // 태그는 이름만, 숙련도는 strengths에 구조화해 보낸다.
    // "React (능숙)"처럼 한 문자열에 섞으면 추천 엔진이 태그를 제대로 비교하지 못한다.
    const strengthLabels = selectedStrengths.map((item) => item.label);

    try {
      await createProfile.mutateAsync({
        interests: topicLabels,
        skillTags: strengthLabels,
        strengths: selectedStrengths.map((item) => ({
          key: item.id,
          label: item.label,
          level: strengthLevels[item.id],
        })),
        projectHistory: goalLabels,
        collabStyle: '상호보완형',
        visibilityScope: 'public',
        bio: bio.trim() || undefined,
        socialLinks: {
          blog: socialLinks.blog.trim() || undefined,
          instagram: socialLinks.instagram.trim() || undefined,
          github: socialLinks.github.trim() || undefined,
        },
      });
      sessionStorage.removeItem('yeon_onboarding_topics');
      sessionStorage.removeItem('yeon_onboarding_goals');
      navigate('/', { replace: true });
    } catch {
      pushToast(t.onboarding.saveFailed, 'error');
    }
  };

  return (
    <main className={`onboarding-page onboarding-step-${step}`}>
      <div className="onboarding-shell">
        <header className="onboarding-progress onboarding-reveal" style={{ '--delay': '30ms' } as CSSProperties}>
          <div className="onboarding-progress-meta">
            <span>{t.onboarding.progressLabel}</span>
            <strong>{step} / 4</strong>
          </div>
          <div className="onboarding-progress-track" aria-label={`온보딩 4단계 중 ${step}단계`}>
            {[1, 2, 3, 4].map((progressStep) => (
              <span key={progressStep} className={progressStep <= step ? 'is-active' : ''} />
            ))}
          </div>
        </header>

        {step === 1 ? (
          <div className="onboarding-step-content" key="topics">
            <section className="onboarding-intro onboarding-reveal" style={{ '--delay': '90ms' } as CSSProperties}>
              <p className="onboarding-step-label">{t.onboarding.topicStep}</p>
              <h1>
                {t.onboarding.topicTitlePrefix}
                <strong>{t.onboarding.topicTitleHighlight}</strong>
                {t.onboarding.topicTitleSuffix}
              </h1>
              <p>{t.onboarding.topicGuideLine1}<br />{t.onboarding.topicGuideLine2}</p>
            </section>

            <section className="onboarding-topic-grid" aria-label={t.onboarding.topicGridLabel}>
              {TOPICS.map(({ id, label, icon: Icon, tone }, index) => {
                const selected = selectedTopics.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`onboarding-topic onboarding-reveal ${selected ? 'is-selected' : ''}`}
                    style={{ '--delay': `${150 + index * 45}ms` } as CSSProperties}
                    onClick={() => toggleTopic(id)}
                    aria-pressed={selected}
                  >
                    <span className={`onboarding-topic-icon tone-${tone}`}>
                      <Icon aria-hidden={true} />
                    </span>
                    <span className="onboarding-topic-label">{label}</span>
                  </button>
                );
              })}
            </section>

            <div className="onboarding-footer onboarding-reveal" style={{ '--delay': '620ms' } as CSSProperties}>
              <button type="button" className="onboarding-next" disabled={selectedTopics.length === 0} onClick={handleTopicNext}>
                <span>{t.onboarding.next}</span>
                <Sparkles aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="onboarding-step-content" key="goals">
            <section className="onboarding-intro onboarding-goal-intro onboarding-reveal" style={{ '--delay': '70ms' } as CSSProperties}>
              <button type="button" className="onboarding-back" onClick={() => setStep(1)} aria-label="이전 단계로">
                <ChevronLeft aria-hidden="true" />
              </button>
              <p className="onboarding-step-label">{t.onboarding.goalStep}</p>
              <h1>
                {t.onboarding.goalTitlePrefix}
                <strong>{t.onboarding.goalTitleHighlight}</strong>
                {t.onboarding.goalTitleSuffix}
              </h1>
              <p>{t.onboarding.goalGuideLine1}<br />{t.onboarding.goalGuideLine2}</p>
            </section>

            <section className="onboarding-goal-grid" aria-label={t.onboarding.goalGridLabel}>
              {GOALS.map(({ id, label, icon: Icon, tone }, index) => {
                const selected = selectedGoals.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`onboarding-goal-card onboarding-reveal ${selected ? 'is-selected' : ''}`}
                    style={{ '--delay': `${130 + index * 55}ms` } as CSSProperties}
                    onClick={() => toggleGoal(id)}
                    aria-pressed={selected}
                  >
                    <span className={`onboarding-goal-icon tone-${tone}`}><Icon aria-hidden={true} /></span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </section>

            <div className="onboarding-footer onboarding-reveal" style={{ '--delay': '520ms' } as CSSProperties}>
              <button type="button" className="onboarding-next" disabled={selectedGoals.length === 0} onClick={handleGoalNext}>
                <span>{t.onboarding.next}</span>
                <Sparkles aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : step === 3 ? (
          <div className="onboarding-step-content" key="strengths">
            <section className="onboarding-intro onboarding-goal-intro onboarding-reveal" style={{ '--delay': '70ms' } as CSSProperties}>
              <button type="button" className="onboarding-back" onClick={() => setStep(2)} aria-label="이전 단계로">
                <ChevronLeft aria-hidden="true" />
              </button>
              <p className="onboarding-step-label">{t.onboarding.strengthStep}</p>
              <h1>
                {t.onboarding.strengthTitlePrefix}
                <strong>{t.onboarding.strengthTitleHighlight}</strong>
                {t.onboarding.strengthTitleSuffix}
              </h1>
              <p>{t.onboarding.strengthGuide}</p>
            </section>

            <section className="onboarding-strength-builder onboarding-reveal" style={{ '--delay': '130ms' } as CSSProperties}>
              <div className="onboarding-strength-chips" aria-label={t.onboarding.unselectedStrengthsLabel}>
                {STRENGTHS.filter((item) => !strengthLevels[item.id]).map((item) => (
                  <button key={item.id} type="button" onClick={() => addStrength(item.id)}>
                    <span aria-hidden="true">+</span>
                    {item.label}
                  </button>
                ))}
              </div>

              <StrengthBubbleCanvas
                items={STRENGTHS.filter((item) => strengthLevels[item.id]).map((item) => ({
                  ...item,
                  level: strengthLevels[item.id],
                }))}
                onGrow={growStrength}
                onRemove={removeStrength}
              />
            </section>

            <div className="onboarding-footer onboarding-reveal" style={{ '--delay': '240ms' } as CSSProperties}>
              <button
                type="button"
                className="onboarding-next"
                disabled={Object.keys(strengthLevels).length === 0}
                onClick={() => {
                  setStep(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>{t.onboarding.next}</span>
                <Sparkles aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="onboarding-step-content" key="showcase">
            <section className="onboarding-intro onboarding-goal-intro onboarding-reveal" style={{ '--delay': '70ms' } as CSSProperties}>
              <button type="button" className="onboarding-back" onClick={() => setStep(3)} aria-label="이전 단계로">
                <ChevronLeft aria-hidden="true" />
              </button>
              <p className="onboarding-step-label">{t.onboarding.showcaseStep}</p>
              <h1>
                {t.onboarding.showcaseTitlePrefix}
                <strong>{t.onboarding.showcaseTitleHighlight}</strong>
                {t.onboarding.showcaseTitleSuffix}
              </h1>
              <p>{t.onboarding.showcaseGuideLine1}<br />{t.onboarding.showcaseGuideLine2}</p>
            </section>

            <section className="onboarding-showcase-form">
              <label className="onboarding-showcase-field onboarding-reveal" style={{ '--delay': '130ms' } as CSSProperties}>
                <span>{t.onboarding.bioLabel}</span>
                <div className="onboarding-showcase-input onboarding-showcase-textarea">
                  <FileText aria-hidden="true" />
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={120}
                    rows={3}
                    placeholder={t.onboarding.bioPlaceholder}
                  />
                </div>
                <small>{bio.length} / 120</small>
              </label>

              <label className="onboarding-showcase-field onboarding-reveal" style={{ '--delay': '190ms' } as CSSProperties}>
                <span>{t.onboarding.blogLabel}</span>
                <div className="onboarding-showcase-input">
                  <Link2 aria-hidden="true" />
                  <input type="url" inputMode="url" value={socialLinks.blog} onChange={(event) => setSocialLinks((current) => ({ ...current, blog: event.target.value }))} placeholder="https://blog.example.com" />
                </div>
              </label>

              <label className="onboarding-showcase-field onboarding-reveal" style={{ '--delay': '250ms' } as CSSProperties}>
                <span>{t.onboarding.instagramLabel}</span>
                <div className="onboarding-showcase-input">
                  <AtSign aria-hidden="true" />
                  <input type="text" autoCapitalize="none" value={socialLinks.instagram} onChange={(event) => setSocialLinks((current) => ({ ...current, instagram: event.target.value }))} placeholder="@username" />
                </div>
              </label>

              <label className="onboarding-showcase-field onboarding-reveal" style={{ '--delay': '310ms' } as CSSProperties}>
                <span>{t.onboarding.githubLabel}</span>
                <div className="onboarding-showcase-input">
                  <CodeXml aria-hidden="true" />
                  <input type="url" inputMode="url" value={socialLinks.github} onChange={(event) => setSocialLinks((current) => ({ ...current, github: event.target.value }))} placeholder="https://github.com/username" />
                </div>
              </label>
            </section>

            <div className="onboarding-footer onboarding-reveal" style={{ '--delay': '370ms' } as CSSProperties}>
              <button type="button" className="onboarding-next" disabled={createProfile.isPending} onClick={handleComplete}>
                <span>{createProfile.isPending ? t.common.saving : t.onboarding.complete}</span>
                <Sparkles aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
