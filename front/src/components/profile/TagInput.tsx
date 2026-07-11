import { useId, useState } from 'react';
import { useTranslation } from '../../i18n';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
}

// FR-2.2: 자유 텍스트 입력 시 자동완성 태그 후보만 제시 (백엔드 정규화 이전 raw 태그)
export function TagInput({ label, value, onChange, suggestions = [], placeholder }: TagInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const inputId = useId();

  const filteredSuggestions = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()),
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-xs font-semibold text-neutral-600">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={t.tagInput.removeAriaLabel(tag)}
            className="rounded-full border border-brand-indigo/30 bg-gradient-to-r from-brand-coral/10 to-brand-indigo/10 px-3 py-1.5 text-xs font-semibold text-brand-navy"
          >
            {tag} ✕
          </button>
        ))}
      </div>

      <input
        id={inputId}
        type="text"
        value={draft}
        placeholder={placeholder ?? t.tagInput.addPlaceholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(draft);
          }
        }}
        className="rounded-full border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-brand-indigo"
      />

      {draft && filteredSuggestions.length > 0 && (
        <div role="listbox" className="flex flex-wrap gap-2">
          {filteredSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => addTag(s)}
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-brand-indigo hover:text-brand-indigo"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
