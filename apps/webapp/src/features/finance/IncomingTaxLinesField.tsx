import { formatMoney } from '@bautakt/finance';
import { Button, Input, Label, Select } from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import {
  parseTaxKind,
  TAX_KIND_OPTIONS,
  type TaxKind,
  type TaxLine,
  vatDeviation,
} from './incomingTaxLines';
import { taxDrafts, type TaxRow, toInput } from './incomingTaxRows';

/**
 * Steuerart der Rechnung (bautakt-web#168). Ein Satz: nur die Art wählen,
 * Netto und Steuer sind die aus dem Kopf. Mehrere Sätze: Beträge je Zeile,
 * darunter die Summe gegen den Kopf.
 */
/** Höchstens so viele Sätze; die Datenbank nimmt bis zu 10. */
const MAX_ROWS = 5;

export function IncomingTaxLinesField({
  rows,
  onChange,
  header,
  guessedKind,
  disabled,
  required,
}: {
  rows: TaxRow[];
  onChange: (rows: TaxRow[]) => void;
  header: { netMinor: number | null; vatMinor: number | null };
  /** Aus dem Kopf erraten (19 %/7 %), solange bei einem Satz nichts gewählt ist. */
  guessedKind: TaxKind | null;
  disabled: boolean;
  required: boolean;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const single = rows.length === 1;

  // Arten, die gespeichert sind, aber nicht angeboten werden, bleiben wählbar.
  const options = [
    ...TAX_KIND_OPTIONS,
    ...rows.flatMap((row) => (row.kind && !TAX_KIND_OPTIONS.includes(row.kind) ? [row.kind] : [])),
  ];

  function label(kind: TaxKind) {
    const parsed = parseTaxKind(kind);
    if (!parsed) return kind;
    return t(`domain:incomingTaxLines.mode.${parsed.mode}`, {
      rate: parsed.rate.toLocaleString('de-DE'),
    });
  }

  function setRow(index: number, patch: Partial<TaxRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function split() {
    // Der erste Satz übernimmt den Kopf; den Rest trägt man in die zweite Zeile ein.
    onChange([
      {
        kind: rows[0].kind ?? guessedKind,
        net: toInput(header.netMinor),
        vat: toInput(header.vatMinor),
      },
      { kind: null, net: '', vat: '' },
    ]);
  }

  function remove(index: number) {
    const next = rows.filter((_, i) => i !== index);
    // Zurück auf einen Satz: Beträge wieder aus dem Kopf.
    onChange(next.length === 1 ? [{ ...next[0], net: '', vat: '' }] : next);
  }

  const kindSelect = (index: number, row: TaxRow, id: string) => (
    <Select
      id={id}
      value={(single ? (row.kind ?? guessedKind) : row.kind) ?? ''}
      disabled={disabled}
      onChange={(_, { value }) => setRow(index, { kind: value ? (value as TaxKind) : null })}
    >
      <option value="">{t('domain:incomingTaxLines.choose')}</option>
      {options.map((kind) => (
        <option key={kind} value={kind}>
          {label(kind)}
        </option>
      ))}
    </Select>
  );

  if (single) {
    const id = `${baseId}-kind`;
    const kind = rows[0].kind ?? guessedKind;
    const deviation =
      kind && header.netMinor !== null && header.vatMinor !== null
        ? vatDeviation({ kind, netMinor: header.netMinor, vatMinor: header.vatMinor })
        : 0;
    return (
      <div className="grid gap-2">
        <Label htmlFor={id} required={required}>
          {t('domain:incomingTaxLines.kind')}
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-64 flex-1">{kindSelect(0, rows[0], id)}</div>
          {disabled ? null : (
            <Button type="button" appearance="subtle" icon={<AddRegular />} onClick={split}>
              {t('domain:incomingTaxLines.split')}
            </Button>
          )}
        </div>
        <TaxHint
          kind={kind}
          guessed={rows[0].kind === null && guessedKind !== null}
          deviation={deviation}
        />
      </div>
    );
  }

  const drafts = taxDrafts(rows);
  const netSum = drafts.reduce((sum, line) => sum + (line.netMinor ?? 0), 0);
  const vatSum = drafts.reduce((sum, line) => sum + (line.vatMinor ?? 0), 0);
  const sumOk = netSum === header.netMinor && vatSum === header.vatMinor;

  return (
    <div className="grid gap-3">
      <Label required={required}>{t('domain:incomingTaxLines.splitTitle')}</Label>
      {rows.map((row, index) => {
        const draft = drafts[index];
        const deviation =
          row.kind && draft.netMinor !== null && draft.vatMinor !== null
            ? vatDeviation({
                kind: row.kind,
                netMinor: draft.netMinor,
                vatMinor: draft.vatMinor,
              } satisfies TaxLine)
            : 0;
        const ids = {
          kind: `${baseId}-${index}-kind`,
          net: `${baseId}-${index}-net`,
          vat: `${baseId}-${index}-vat`,
        };
        return (
          <div key={index} className="border-border grid gap-2 rounded-md border p-3">
            <div className="grid items-end gap-2 @lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="grid gap-1">
                <Label htmlFor={ids.kind} size="small">
                  {t('domain:incomingTaxLines.kind')}
                </Label>
                {kindSelect(index, row, ids.kind)}
              </div>
              <AmountInput
                id={ids.net}
                label={t('domain:invoices.net')}
                value={row.net}
                disabled={disabled}
                onChange={(net) => setRow(index, { net })}
              />
              <AmountInput
                id={ids.vat}
                label={t('domain:invoices.vat')}
                value={row.vat}
                disabled={disabled}
                onChange={(vat) => setRow(index, { vat })}
              />
              {disabled ? null : (
                <Button
                  type="button"
                  appearance="subtle"
                  icon={<DeleteRegular />}
                  aria-label={t('domain:incomingTaxLines.remove')}
                  onClick={() => remove(index)}
                />
              )}
            </div>
            <TaxHint kind={row.kind} guessed={false} deviation={deviation} />
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {header.netMinor !== null && header.vatMinor !== null ? (
          <p className={sumOk ? 'text-muted-foreground text-sm' : 'text-destructive text-sm'}>
            {sumOk
              ? t('domain:incomingTaxLines.sumOk')
              : t('domain:incomingTaxLines.sumHint', {
                  net: formatMoney(netSum),
                  vat: formatMoney(vatSum),
                  headerNet: formatMoney(header.netMinor),
                  headerVat: formatMoney(header.vatMinor),
                })}
          </p>
        ) : (
          <span />
        )}
        {disabled || rows.length >= MAX_ROWS ? null : (
          <Button
            type="button"
            appearance="subtle"
            icon={<AddRegular />}
            onClick={() => onChange([...rows, { kind: null, net: '', vat: '' }])}
          >
            {t('domain:incomingTaxLines.add')}
          </Button>
        )}
      </div>
    </div>
  );
}

function AmountInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} size="small">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        input={{ className: 'text-right tabular-nums' }}
        placeholder="0,00"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Erklärung zur gewählten Art und Hinweis, wenn die Steuer vom Satz abweicht. */
function TaxHint({
  kind,
  guessed,
  deviation,
}: {
  kind: TaxKind | null;
  guessed: boolean;
  deviation: number;
}) {
  const { t } = useTranslation();
  const parsed = kind ? parseTaxKind(kind) : null;
  const notes: string[] = [];
  if (guessed) notes.push(t('domain:incomingTaxLines.guessed'));
  if (parsed && parsed.mode !== 'standard')
    notes.push(t(`domain:incomingTaxLines.help.${parsed.mode}`));
  if (deviation !== 0) {
    notes.push(
      t('domain:incomingTaxLines.deviation', { amount: formatMoney(Math.abs(deviation)) }),
    );
  }
  if (notes.length === 0) return null;
  return <p className="text-muted-foreground text-sm">{notes.join(' ')}</p>;
}
