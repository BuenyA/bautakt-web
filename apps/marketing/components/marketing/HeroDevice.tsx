/**
 * Dekoratives Phone+Plan-Mock für den Hero.
 * Kein echtes Produkt-Screenshot, nur eine stilisierte Silhouette.
 */
export function HeroDevice() {
  return (
    <div
      className="relative mx-auto mt-14 w-full max-w-lg animate-[hero-rise_0.7s_ease-out_0.15s_both]"
      aria-hidden
    >
      {/* Planungsfläche (hinter dem Phone) */}
      <div className="absolute inset-x-8 top-6 bottom-0 rounded-2xl border border-border bg-background-second shadow-sm sm:inset-x-12">
        <div className="flex flex-col gap-2 p-5 pt-8 sm:p-6 sm:pt-10">
          <div className="h-2.5 w-24 rounded bg-border-strong/60" />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-md bg-background"
                style={{ opacity: 0.55 + (i % 3) * 0.12 }}
              />
            ))}
          </div>
          <div className="mt-3 h-2 w-32 rounded bg-border/80" />
          <div className="h-2 w-20 rounded bg-border/60" />
        </div>
      </div>

      {/* Phone */}
      <div className="relative mx-auto w-[200px] sm:w-[220px]">
        <div className="rounded-[1.75rem] border-[3px] border-[#1C1F26] bg-background shadow-lg">
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-[#1C1F26]/20" />
          <div className="flex flex-col gap-3 px-3.5 pt-4 pb-5">
            <div className="flex items-center justify-between">
              <div className="h-2 w-16 rounded bg-[#1C1F26]/25" />
              <div className="h-5 w-5 rounded-full bg-primary/15" />
            </div>
            <div className="rounded-xl bg-accent p-3">
              <div className="h-2 w-20 rounded bg-primary/40" />
              <div className="mt-2 h-2 w-28 rounded bg-primary/20" />
              <div className="mt-3 h-6 w-full rounded-md bg-primary/80" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2">
                <div className="h-6 w-6 shrink-0 rounded-md bg-background-third" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="h-1.5 w-full rounded bg-[#1C1F26]/20" />
                  <div className="h-1.5 w-2/3 rounded bg-[#1C1F26]/10" />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2">
                <div className="h-6 w-6 shrink-0 rounded-md bg-background-third" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="h-1.5 w-full rounded bg-[#1C1F26]/20" />
                  <div className="h-1.5 w-1/2 rounded bg-[#1C1F26]/10" />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 opacity-70">
                <div className="h-6 w-6 shrink-0 rounded-md bg-background-third" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="h-1.5 w-4/5 rounded bg-[#1C1F26]/15" />
                  <div className="h-1.5 w-2/5 rounded bg-[#1C1F26]/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
