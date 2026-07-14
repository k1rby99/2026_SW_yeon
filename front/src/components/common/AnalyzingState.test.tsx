import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyzingState } from './AnalyzingState';

const STEPS = ['프로필을 읽는 중', '후보를 추리는 중', '가장 맞는 인연을 고르는 중'] as const;

describe('AnalyzingState', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('스크린 리더에 진행 상태로 노출된다', () => {
    render(<AnalyzingState title="분석 중" steps={STEPS} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('분석 중')).toBeInTheDocument();
  });

  it('시간이 지나면 다음 단계로 넘어가고, 지난 단계는 완료로 표시된다', () => {
    const { container } = render(<AnalyzingState title="분석 중" steps={STEPS} />);
    const items = () => container.querySelectorAll('.analyzing-steps li');

    expect(items()[0]).toHaveClass('is-active');
    expect(items()[1]).not.toHaveClass('is-active');

    act(() => vi.advanceTimersByTime(2800));

    expect(items()[0]).toHaveClass('is-done');
    expect(items()[1]).toHaveClass('is-active');
  });

  it('마지막 단계에서 멈춰 기다린다 — 처음으로 되돌아가지 않는다', () => {
    // 되돌아 반복하면 진행이 없다는 인상을 준다. 응답이 늦어져도 마지막 단계를 유지해야 한다.
    const { container } = render(<AnalyzingState title="분석 중" steps={STEPS} />);

    // 타이머는 단계마다 새로 걸리므로 한 번에 감지 않고 단계별로 진행시킨다.
    for (let tick = 0; tick < 10; tick += 1) {
      act(() => vi.advanceTimersByTime(2800));
    }

    const items = container.querySelectorAll('.analyzing-steps li');
    expect(items[items.length - 1]).toHaveClass('is-active');
    expect(items[0]).toHaveClass('is-done');
  });
});
