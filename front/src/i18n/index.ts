import ko from './ko';

// v1은 한국어 단일 로케일 고정. 다국어 지원 시 locale 딕셔너리를 추가하고
// 이 훅의 반환값만 교체하면 되도록 컴포넌트는 항상 useTranslation()을 통해서만 문자열에 접근한다.
export function useTranslation() {
  return { t: ko, locale: 'ko' as const };
}

export default ko;
