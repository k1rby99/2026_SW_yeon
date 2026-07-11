import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation } from '../../types/domain';

const recommendation: Recommendation = {
  id: 'rec-1',
  candidateId: 'user-1',
  candidateProfileSummary: { interests: ['UX 리서치'], skillTags: ['Figma', 'React'] },
  complementScore: 92,
  gapTags: ['백엔드 아키텍처'],
  reasonText: '설명 텍스트',
  createdAt: new Date().toISOString(),
};

describe('RecommendationCard', () => {
  it('renders score, gap tag badges, and links to the detail route', () => {
    render(
      <MemoryRouter>
        <RecommendationCard recommendation={recommendation} />
      </MemoryRouter>,
    );

    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('백엔드 아키텍처')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/recommendations/rec-1');
  });
});
