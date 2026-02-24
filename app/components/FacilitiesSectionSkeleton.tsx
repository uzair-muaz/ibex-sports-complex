export function FacilitiesSectionSkeleton() {
  return (
    <section
      className="py-32 px-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200 relative z-20 min-h-[600px] flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="max-w-7xl mx-auto w-full space-y-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="h-16 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-6 w-72 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[600px] rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-800 animate-pulse"
              style={i % 2 === 0 ? { marginTop: "0" } : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
