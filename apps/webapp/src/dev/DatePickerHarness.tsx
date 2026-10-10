import { DatePicker, DateRangePicker, FormDrawer, FormDrawerTitle } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  DrawerBody,
  DrawerHeader,
} from '@fluentui/react-components';
import { useState } from 'react';

import { useTheme } from '@/app/useTheme';

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
  const { setTheme } = useTheme();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col gap-16 p-8 pt-28 pl-40">
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="theme-light"
          className="border-border rounded-md border px-3 py-1 text-sm"
          onClick={() => setTheme('light')}
        >
          Hell
        </button>
        <button
          type="button"
          data-testid="theme-dark"
          className="border-border rounded-md border px-3 py-1 text-sm"
          onClick={() => setTheme('dark')}
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

      {/* Wie der Belegeditor: die Fällig-Meldung steht über den Feldern,
          der Kalender öffnet nach unten und darf sie nicht zudecken. */}
      <section data-testid="due-before-issue" className="max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <p
            role="alert"
            data-testid="due-before-issue-message"
            className="text-destructive text-sm sm:col-span-2 xl:col-span-4"
          >
            Das Fälligkeitsdatum liegt vor dem Rechnungsdatum.
          </p>
          <div className="grid gap-2">
            <span>Kunde</span>
            <div className="border-border flex h-8 items-center rounded-sm border px-3 text-sm">
              Ohne Kunde
            </div>
          </div>
          <div className="grid gap-2">
            <span>Rechnungsdatum</span>
            <DatePicker
              aria-label="Rechnungsdatum leer"
              value=""
              placeholder="Wird beim Ausstellen gesetzt"
              onChange={() => undefined}
            />
            <p data-testid="empty-issue-hint" className="text-muted-foreground text-sm">
              Noch nicht ausgestellt
            </p>
          </div>
          <div className="grid gap-2">
            <span>Leistungsdatum</span>
            <DatePicker aria-label="Leistungsdatum" value="" onChange={() => undefined} />
          </div>
          <div className="grid gap-2">
            <span>Fällig</span>
            <DatePicker aria-label="Fällig" value="2026-09-06" onChange={() => undefined} />
          </div>
        </div>
      </section>

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

      <section data-testid="assignment-grid" className="max-w-xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <span>Beginn, Datum</span>
            <DatePicker aria-label="Einsatz Beginn" value="2026-10-10" onChange={() => undefined} />
          </div>
          <div className="grid gap-2">
            <span>Beginn, Uhrzeit</span>
            <div className="border-border flex h-8 items-center rounded-sm border px-3 text-sm">
              07:00
            </div>
          </div>
          <div className="grid gap-2">
            <span data-testid="end-date-label">Ende, Datum</span>
            <DatePicker aria-label="Einsatz Ende" value="2026-10-09" onChange={() => undefined} />
          </div>
          <div className="grid gap-2">
            <span data-testid="end-time-label">Ende, Uhrzeit</span>
            <div className="border-border flex h-8 items-center rounded-sm border px-3 text-sm">
              16:00
            </div>
          </div>
          <p role="alert" className="text-destructive text-sm sm:col-span-2">
            Das Ende liegt vor dem Beginn.
          </p>
        </div>
        <button type="button" disabled className="mt-4">
          Speichern
        </button>
      </section>

      <FormDrawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerHeader>
          <FormDrawerTitle>Zeiteintrag</FormDrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div data-testid="picker-sheet" className="mt-16 max-w-sm">
            <DatePicker aria-label="Datum im Sheet" value={inSheet} onChange={setInSheet} />
          </div>
        </DrawerBody>
      </FormDrawer>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Beleg</DialogTitle>
            <DialogContent>
              <div data-testid="picker-dialog" className="max-w-sm">
                <DatePicker aria-label="Datum im Dialog" value={inDialog} onChange={setInDialog} />
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger action="close" disableButtonEnhancement>
                <Button>Schließen</Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
