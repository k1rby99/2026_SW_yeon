import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GoalPipelineStatus } from './GoalPipelineStatus';
import * as useGoalsModule from '../../hooks/useGoals';
import type { Goal } from '../../types/domain';

function mockGoal(overrides: Partial<Goal>) {
  vi.spyOn(useGoalsModule, 'useGoal').mockReturnValue({
    data: {
      id: 'goal-1',
      text: 'text',
      category: '공모전',
      status: 'processing',
      createdAt: new Date().toISOString(),
      ...overrides,
    },
    isLoading: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('GoalPipelineStatus', () => {
  it('shows the retry button when the pipeline failed (EC-1)', async () => {
    const user = userEvent.setup();
    mockGoal({ status: 'failed' });
    const onRetry = vi.fn();

    render(<GoalPipelineStatus goalId="goal-1" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows processing steps while status is processing', () => {
    mockGoal({ status: 'processing' });
    render(<GoalPipelineStatus goalId="goal-1" onRetry={vi.fn()} />);

    expect(screen.getByText('프로필 분석')).toBeInTheDocument();
    expect(screen.queryByText('추천 리스트 준비 완료!')).not.toBeInTheDocument();
  });

  it('calls onDone once the pipeline completes', () => {
    mockGoal({ status: 'completed' });
    const onDone = vi.fn();

    render(<GoalPipelineStatus goalId="goal-1" onRetry={vi.fn()} onDone={onDone} />);

    expect(screen.getByText('추천 리스트 준비 완료!')).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
