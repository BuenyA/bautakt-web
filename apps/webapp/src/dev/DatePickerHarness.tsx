import {
  DatePicker,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@bautakt/ui';
import { useState } from 'react';

/**
 * Nur `vite dev`. `main.tsx` lädt die Seite ausschließlich bei
 * `import.meta.env.DEV`, der Produktionsbuild enthält sie nicht.
 *
 * Steht absichtlich nicht hinter der Anmeldung: der Kalender soll hier
 * allein, im Sheet und im Dialog gemessen werden.
 */
export function DatePickerHarness() {
  const [alone, setAlone] = useState('2026-08-15');
  const [inSheet, setInSheet] = useState('2026-08-15');
  const [inDialog, setInDialog] = useState('2026-08-15');
  const [rangeStart, setRangeStart] = useState('2026-10-01');
  const [rangeEnd, setRangeEnd] = useState('2026-10-09');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col gap-16 p-8 pt-28 pl-40">
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="theme-light"
          className="border-border rounded-md border px-3 py-1 text-sm"
          onClick={() => document.documentElement.classList.remove('dark')}
        >
          Hell
        </button>
        <button
          type="button"
          data-testid="theme-dark"
          className="border-border rounded-md border px-3 py-1 text-sm"
          onClick={() => document.documentElement.classList.add('dark')}
        >
          Dunkel
        </button>
        <button
          type="button"
          data-testid="open-sheet"
          className="border-border rounded-md border px-3 py-1 text-sm"
          onClick={() => {
            setDialogOpen(false);
            setSheetOpen(true);
          }}
        >
          Sheet
        </button>
        <button
          type="button"
          data-testid="open-dialog"
          className="border-border rounded-md border px-3 py-1 text-sm"
          onClick={() => {
            setSheetOpen(false);
            setDialogOpen(true);
          }}
        >
          Dialog
        </button>
      </div>

      <section data-testid="picker-standalone" className="max-w-sm">
        <DatePicker aria-label="Datum allein" value={alone} onChange={setAlone} />
      </section>

      <section data-testid="picker-range" className="max-w-xl">
        <DateRangePicker
          start={rangeStart}
          end={rangeEnd}
          onStartChange={setRangeStart}
          onEndChange={setRangeEnd}
          startLabel="Beginn"
          endLabel="Ende"
          startAriaLabel="Bereich Beginn"
          endAriaLabel="Bereich Ende"
        />
      </section>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetTitle>Zeiteintrag</SheetTitle>
          <div data-testid="picker-sheet" className="mt-16 max-w-sm">
            <DatePicker aria-label="Datum im Sheet" value={inSheet} onChange={setInSheet} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Beleg</DialogTitle>
          <div data-testid="picker-dialog" className="max-w-sm">
            <DatePicker aria-label="Datum im Dialog" value={inDialog} onChange={setInDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
