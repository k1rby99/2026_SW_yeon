import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Recommendation } from '../../types/domain';
import { useTranslation } from '../../i18n';

const AVATAR_TONES = [
  'linear-gradient(145deg, #f3b4ad, #d986a3)',
  'linear-gradient(145deg, #a9afe9, #7f83c9)',
  'linear-gradient(145deg, #a9d8cf, #75aea9)',
  'linear-gradient(145deg, #e8c29d, #d69a86)',
] as const;

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { t } = useTranslation();
  const number = Number(recommendation.candidateId.match(/\d+/)?.[0] ?? 1);
  const name = t.home.candidateNames[(number - 1) % t.home.candidateNames.length];
  const role = recommendation.candidateProfileSummary.skillTags[0] ?? t.home.defaultRole;

  return (
    <Link to={`/recommendations/${recommendation.id}`} className="home-profile-card">
      <span
        className="home-profile-avatar"
        style={{ background: AVATAR_TONES[(number - 1) % AVATAR_TONES.length] }}
        aria-hidden="true"
      >
        {name.slice(0, 1)}
      </span>

      <span className="home-profile-content">
        <span className="home-profile-heading">
          <strong>{name}</strong>
          <span>{role}</span>
        </span>
        <span className="home-profile-tags">
          {recommendation.gapTags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
        </span>
        <span className="home-match-score">
          {t.home.complementMatch} <strong>{recommendation.complementScore}%</strong>
        </span>
      </span>

      <span className="home-profile-arrow" aria-hidden="true"><ChevronRight /></span>
    </Link>
  );
}
