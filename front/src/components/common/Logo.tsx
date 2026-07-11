import logoSrc from '../../assets/logo.png';

const SIZES = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-28 w-28',
} as const;

// 연_logo.png를 화면 맥락에 맞는 크기로 노출하는 공용 브랜드 마크
export function Logo({ size = 'md', className = '' }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <img
      src={logoSrc}
      alt="연(緣) 로고"
      className={`${SIZES[size]} rounded-2xl object-contain ${className}`}
    />
  );
}
