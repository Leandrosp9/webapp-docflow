export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />
}

export function PageSkeleton() {
  return (
    <div aria-label="Carregando" className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}
