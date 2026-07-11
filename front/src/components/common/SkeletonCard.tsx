// 추천 리스트 최초 로딩 시 체감 지연 완화용 스켈레톤 (front_request.md §9 성능 요구사항)
export function SkeletonCard() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-neutral-200 p-4">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-neutral-200" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-2/5 rounded-full bg-neutral-200" />
        <div className="h-2 w-3/5 rounded-full bg-neutral-100" />
      </div>
      <div className="h-3 w-8 rounded-full bg-neutral-200" />
    </div>
  );
}
