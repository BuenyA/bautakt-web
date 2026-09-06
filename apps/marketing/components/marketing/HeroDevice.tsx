/**
 * Phone-Mock für den Hero (Desktop-Referenz v4.4).
 * Stilisiertes App-UI, kein echtes Screenshot-Asset.
 */
export function HeroDevice() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-sm justify-center lg:max-w-none lg:justify-end"
      aria-hidden
    >
      <div className="relative w-[240px] sm:w-[260px]">
        <div className="rounded-[2rem] border-[5px] border-[#1C1F26] bg-background shadow-[0_24px_48px_-12px_rgba(28,31,38,0.28)]">
          <div className="mx-auto mt-2.5 h-1.5 w-20 rounded-full bg-[#1C1F26]/15" />
          <div className="flex flex-col gap-4 px-4 pt-4 pb-5">
            {/* App-Header mit Signet */}
            <div className="flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bautakt-signet.svg" alt="" width={28} height={28} className="h-7 w-7" />
              <div className="size-7 rounded-full bg-background-third" />
            </div>

            <div>
              <p className="text-[0.65rem] font-medium text-text-subtle">Heute</p>
              <p className="text-sm font-semibold text-[#1C1F26]">Dienstag, 20. Mai</p>
            </div>

            <div>
              <p className="mb-2 text-[0.7rem] font-semibold text-[#1C1F26]">Laufende Aufträge</p>
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-border bg-background-second px-3 py-2.5">
                  <p className="text-xs font-medium text-[#1C1F26]">Kundenanbau Müller</p>
                  <p className="mt-0.5 text-[0.65rem] text-text-subtle">In Arbeit</p>
                </div>
                <div className="rounded-xl border border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-[#1C1F26]">Sanierung Schmidt</p>
                  <p className="mt-0.5 text-[0.65rem] text-text-subtle">Geplant</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-accent px-3 py-3">
              <p className="text-[0.7rem] font-semibold text-accent-foreground">Zeiterfassung</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative flex size-12 items-center justify-center rounded-full border-[3px] border-primary/30 border-t-primary">
                  <span className="text-[0.55rem] font-semibold text-primary">5h 30m</span>
                </div>
                <div>
                  <p className="text-[0.65rem] text-text-secondary">von 8h</p>
                  <p className="text-[0.65rem] font-medium text-[#1C1F26]">Kundenanbau Müller</p>
                </div>
              </div>
            </div>

            {/* Bottom-Nav */}
            <div className="mt-1 flex justify-between border-t border-border pt-3 text-[0.55rem] text-text-subtle">
              <span className="font-semibold text-primary">Übersicht</span>
              <span>Aufträge</span>
              <span>Zeiten</span>
              <span>Rechnungen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
