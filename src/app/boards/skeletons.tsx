const pulse = "animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800";

export function BoardListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading boards"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-32 ${pulse}`} />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading board" className="flex flex-1 flex-col gap-4 p-4">
      <div className={`h-7 w-48 ${pulse}`} />
      <div className="flex gap-3 overflow-hidden">
        {[5, 3, 4].map((cards, i) => (
          <div
            key={i}
            className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-900"
          >
            <div className={`h-5 w-24 ${pulse}`} />
            {Array.from({ length: cards }, (_, j) => (
              <div key={j} className={`h-12 ${pulse}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
