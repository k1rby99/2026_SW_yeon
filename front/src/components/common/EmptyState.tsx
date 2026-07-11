export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-neutral-500">
      <div className="mb-1 h-8 w-8 rounded-full bg-gradient-to-br from-brand-coral/30 to-brand-indigo/30" />
      <p className="text-sm font-medium text-brand-navy">{title}</p>
      {description && <p className="text-xs">{description}</p>}
      {action}
    </div>
  );
}
