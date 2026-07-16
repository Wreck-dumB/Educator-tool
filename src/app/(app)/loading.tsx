export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-4 pt-4">
      <div className="h-8 w-48 rounded-xl bg-ink/10" />
      <div className="h-4 w-72 rounded-lg bg-ink/8" />
      <div className="mt-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-ink/8" />
        ))}
      </div>
    </div>
  );
}
