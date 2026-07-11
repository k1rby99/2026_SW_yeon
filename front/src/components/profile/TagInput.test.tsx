import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('adds a tag on Enter and calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput label="관심사" value={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText('+ 직접입력');
    await user.type(input, '프론트엔드{Enter}');

    expect(onChange).toHaveBeenCalledWith(['프론트엔드']);
  });

  it('removes a tag when its chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput label="관심사" value={['React']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'React 태그 삭제' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('suggests matching options from the suggestions list', async () => {
    const user = userEvent.setup();
    render(
      <TagInput label="관심사" value={[]} onChange={vi.fn()} suggestions={['React', 'Python', 'Figma']} />,
    );

    await user.type(screen.getByPlaceholderText('+ 직접입력'), 'Re');

    expect(screen.getByRole('option', { name: 'React' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Python' })).not.toBeInTheDocument();
  });
});
