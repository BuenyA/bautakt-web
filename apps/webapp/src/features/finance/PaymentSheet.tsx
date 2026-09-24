import { formatMoney, fromMinorUnits, parseMoneyInput, todayIso } from '@bautakt/finance';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from '@bautakt/ui';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { useAddPayment } from './useSalesDocument';

/**
 * ⚠️ Die Werte muessen der Check-Regel von `payments.method` entsprechen:
 * `cash`, `transfer`, `card`, `other`, `skonto`. „bank_transfer" gibt es dort
 * nicht — die Datenbank haette jede Zahlung abgelehnt.
 *
 * `skonto` fehlt bewusst in der Auswahl: Skonto hat im Formular ein eigenes
 * Betragsfeld und ist keine Zahlungsart.
 */
const METHODS = ['transfer', 'cash', 'card', 'other'] as const;

/**
 * Zahlungseingang erfassen.
 *
 * Als Seitenpanel und nicht als eigene Seite: der Beleg bleibt dahinter
 * sichtbar, und genau den braucht man beim Abgleich mit dem Kontoauszug.
 *
 * Das Formular wird nur gemountet, solange das Panel offen ist. Damit setzt es
 * sich beim Oeffnen von selbst zurueck — ein Panel, das noch die Eingabe der
 * vorigen Zahlung zeigt, laedt zu einer Doppelbuchung ein.
 */
export function PaymentSheet({
  documentId,
  open,
  onOpenChange,
  openMinor,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openMinor: number;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open ? (
          <PaymentForm
            documentId={documentId}
            openMinor={openMinor}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PaymentForm({
  documentId,
  openMinor,
  onDone,
}: {
  documentId: string;
  openMinor: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const addPayment = useAddPayment(documentId);
  const amountId = useId();
  const skontoId = useId();
  const dateId = useId();
  const noteId = useId();

  // Der offene Betrag steht als Vorgabe im Feld: der haeufigste Fall ist die
  // vollstaendige Zahlung, und Abtippen ist die haeufigste Fehlerquelle.
  const [amount, setAmount] = useState(() =>
    openMinor > 0 ? String(fromMinorUnits(openMinor)).replace('.', ',') : '',
  );
  const [skonto, setSkonto] = useState('');
  const [paidAt, setPaidAt] = useState(todayIso);
  const [method, setMethod] = useState<string>('transfer');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amountMinor = parseMoneyInput(amount);

    if (amountMinor === null || amountMinor <= 0) {
      setError(t('domain:payments.amountInvalid'));
      return;
    }

    try {
      await addPayment.mutateAsync({
        amountMajor: fromMinorUnits(amountMinor),
        skontoMajor: fromMinorUnits(parseMoneyInput(skonto) ?? 0),
        paidAtIso: paidAt,
        method,
        note: note.trim(),
      });
      toast.success(t('domain:payments.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:payments.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{t('domain:payments.add')}</SheetTitle>
        <SheetDescription>
          {t('domain:payments.openHint', { amount: formatMoney(openMinor) })}
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={amountId}>{t('domain:payments.amount')}</Label>
          <Input
            id={amountId}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={skontoId}>{t('domain:payments.skonto')}</Label>
          <Input
            id={skontoId}
            inputMode="decimal"
            value={skonto}
            onChange={(event) => setSkonto(event.target.value)}
            placeholder="0,00"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={dateId}>{t('domain:payments.paidAt')}</Label>
          <Input
            id={dateId}
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t('domain:payments.method')}</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`domain:payments.methods.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={noteId}>{t('domain:payments.note')}</Label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={addPayment.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}
