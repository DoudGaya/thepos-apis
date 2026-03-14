function Pulse({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-muted/60 ${className}`} style={style} />
}

export function PageLoader() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-7 w-48" />
          <Pulse className="h-4 w-72" />
        </div>
        <Pulse className="h-9 w-24 rounded-md" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-7 w-16" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Pulse className="h-4 w-36" />
            <div className="space-y-2 pt-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <Pulse key={j} className="h-3" style={{ width: `${60 + j * 8}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-muted/40 border-b border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Pulse key={i} className="h-3" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3.5 border-b border-border last:border-0">
            {Array.from({ length: 6 }).map((_, j) => (
              <Pulse key={j} className="h-3" style={{ width: `${40 + ((i * 3 + j * 7) % 5) * 12}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
