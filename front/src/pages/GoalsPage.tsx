import { useState } from 'react';
import { BrainCircuit, Plus, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoomCard } from '../components/room/RoomCard';
import { useAnalyzeGoal, useRecommendedRooms } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import { useTranslation } from '../i18n';
import type { Opportunity } from '../types/domain';

export function GoalsPage() {
  const { t } = useTranslation();
  const pushToast = useUiStore((state) => state.pushToast);
  const navigate = useNavigate();
  const location = useLocation();
  const opportunity = (location.state as { opportunity?: Opportunity } | null)?.opportunity;
  const analyzeGoal = useAnalyzeGoal();
  const { data: rooms } = useRecommendedRooms();
  const [text, setText] = useState(opportunity ? `${opportunity.title}에 함께 참여할 인연을 찾고 싶어요.` : '');
  const [keywords, setKeywords] = useState<string[]>(opportunity ? [opportunity.type === 'contest' ? '공모전' : opportunity.category] : []);

  const toggleKeyword = (keyword: string) => {
    setKeywords((current) => current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword]);
  };

  const submit = async () => {
    try {
      await analyzeGoal.mutateAsync({ text, keywords });
    } catch {
      pushToast(t.goalsPage.createFailed, 'error');
    }
  };

  const recommended = rooms?.items.filter((room) => analyzeGoal.data?.recommendedRoomIds.includes(room.id)) ?? [];

  return (
    <div className="tab-page goal-page">
      <header className="tab-page-header">
        <p>{t.goalsPage.eyebrow}</p>
        <h1>{t.goalsPage.title}</h1>
        <span>{t.goalsPage.subtitle}</span>
      </header>

      <section className="goal-composer">
        <div className="goal-keywords" aria-label={t.goalsPage.keywordLabel}>
          {t.goalsPage.keywords.map((keyword) => (
            <button key={keyword} type="button" onClick={() => toggleKeyword(keyword)} className={keywords.includes(keyword) ? 'is-selected' : ''} aria-pressed={keywords.includes(keyword)}>
              {keyword}
            </button>
          ))}
        </div>
        <label className="goal-textarea">
          <span>{t.goalsPage.freeTextLabel}</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} placeholder={t.goalForm.placeholder} />
        </label>
        <button type="button" className="goal-analyze-button" disabled={(!text.trim() && keywords.length === 0) || analyzeGoal.isPending} onClick={submit}>
          <BrainCircuit aria-hidden="true" />
          {analyzeGoal.isPending ? t.goalsPage.analyzing : t.goalsPage.analyze}
        </button>
      </section>

      {analyzeGoal.data && (
        <section className="goal-result">
          <div className="goal-result-summary">
            <Sparkles aria-hidden="true" />
            <div><span>{t.goalsPage.analysisResult}</span><strong>{analyzeGoal.data.normalizedGoal}</strong></div>
          </div>
          <div className="goal-result-tags">
            {analyzeGoal.data.keywords.map((keyword) => <span key={keyword}>#{keyword}</span>)}
          </div>
          <div className="goal-result-actions">
            <button type="button" onClick={() => navigate('/rooms/new', { state: { analysis: analyzeGoal.data } })}><Plus aria-hidden="true" />{t.goalsPage.createRoom}</button>
          </div>
          <div className="goal-recommended-rooms">
            <h2>{t.goalsPage.recommendedRooms}</h2>
            {recommended.map((room) => <RoomCard key={room.id} room={room} compact />)}
          </div>
        </section>
      )}
    </div>
  );
}
