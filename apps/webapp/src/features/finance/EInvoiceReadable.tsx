import { Badge, MessageBar, MessageBarBody, Text } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@/lib/format';

import {
  type EInvoiceParty,
  type EInvoiceView,
  readEInvoice,
  unitLabel,
  type XmlNode,
} from './eInvoiceView';

/** `Element` des Browsers in den Baum, den `readEInvoice` liest. */
function xmlTree(element: Element): XmlNode {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) attrs[attr.localName] = attr.value;
  return {
    name: element.localName,
    attrs,
    text: Array.from(element.childNodes)
      .filter(
        (node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE,
      )
      .map((node) => node.nodeValue ?? '')
      .join(''),
    children: Array.from(element.children).map(xmlTree),
  };
}

/**
 * E-Rechnungs-XML lesbar aufbereitet (bautakt-web#88, Teil 3): Kopf, Parteien,
 * Positionen, Summen, Zahlung -- nur, was im Dokument steht. XML, das weder CII
 * noch UBL ist, erscheint so, wie es abgelegt ist.
 */
export function EInvoiceXml({ bytes }: { bytes: Uint8Array }) {
  const { t } = useTranslation();
  const { source, view } = useMemo(() => {
    const source = new TextDecoder().decode(bytes);
    const document = new DOMParser().parseFromString(source, 'application/xml');
    const broken = document.getElementsByTagName('parsererror').length > 0;
    const root = document.documentElement;
    return { source, view: broken || !root ? null : readEInvoice(xmlTree(root)) };
  }, [bytes]);

  if (!view) {
    return (
      <div className="flex flex-col gap-3">
        <MessageBar intent="info">
          <MessageBarBody>{t('domain:incomingInvoiceForm.original.notEInvoice')}</MessageBarBody>
        </MessageBar>
        <pre className="bg-muted text-foreground overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
          {source}
        </pre>
      </div>
    );
  }
  return <EInvoiceReadable view={view} />;
}

function money(value: string, currency: string): string {
  if (!value) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  } catch {
    // Unbekannter Währungscode: Zahl mit Code, statt die Ansicht scheitern zu lassen.
    return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}

function date(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value || '—';
}

function EInvoiceReadable({ view }: { view: EInvoiceView }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`domain:incomingInvoiceForm.original.${key}`);

  return (
    <div className="text-foreground flex flex-col gap-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Text as="h3" size={500} weight="semibold">
          {view.isCreditNote ? k('creditNote') : k('invoice')} {view.number}
        </Text>
        <Badge appearance="tint" color="informative">
          {view.syntax === 'cii' ? k('syntaxCii') : k('syntaxUbl')}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Party title={k('seller')} party={view.seller} vatLabel={k('vatId')} />
        <Party title={k('buyer')} party={view.buyer} vatLabel={k('vatId')} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Fact label={k('issueDate')} value={date(view.issueDate)} />
        <Fact label={k('dueDate')} value={date(view.dueDate)} />
        <Fact label={k('currency')} value={view.currency || '—'} />
        <Fact label={k('buyerReference')} value={view.buyerReference || '—'} />
      </dl>

      {view.lines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-left text-xs">
                <th className="py-2 pr-2 font-medium">{k('lineId')}</th>
                <th className="py-2 pr-2 font-medium">{k('lineName')}</th>
                <th className="py-2 pr-2 text-right font-medium">{k('lineQuantity')}</th>
                <th className="py-2 pr-2 text-right font-medium">{k('linePrice')}</th>
                <th className="py-2 pr-2 text-right font-medium">{k('lineVat')}</th>
                <th className="py-2 text-right font-medium">{k('lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {view.lines.map((line, index) => (
                <tr key={`${line.id}-${index}`} className="border-border border-b align-top">
                  <td className="text-muted-foreground py-2 pr-2">{line.id}</td>
                  <td className="py-2 pr-2">{line.name}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums">
                    {line.quantity} {unitLabel(line.unitCode)}
                  </td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums">
                    {money(line.netPrice, view.currency)}
                  </td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums">
                    {line.vatPercent ? `${line.vatPercent} %` : '—'}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">
                    {money(line.lineTotal, view.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <Total label={k('net')} value={money(view.totals.net, view.currency)} />
        <Total label={k('vat')} value={money(view.totals.vat, view.currency)} />
        <Total label={k('gross')} value={money(view.totals.gross, view.currency)} strong />
        {view.totals.payable && view.totals.payable !== view.totals.gross ? (
          <Total label={k('payable')} value={money(view.totals.payable, view.currency)} strong />
        ) : null}
      </dl>

      {view.ibans.length > 0 || view.paymentTerms ? (
        <section className="flex flex-col gap-1">
          <Text weight="semibold">{k('payment')}</Text>
          {view.ibans.map((iban) => (
            <span key={iban} className="tabular-nums">
              {k('iban')}: {iban}
            </span>
          ))}
          {view.paymentTerms ? (
            <span className="text-muted-foreground whitespace-pre-line">{view.paymentTerms}</span>
          ) : null}
        </section>
      ) : null}

      {view.notes.length > 0 ? (
        <section className="flex flex-col gap-1">
          <Text weight="semibold">{k('notes')}</Text>
          {view.notes.map((note, index) => (
            <span key={index} className="text-muted-foreground whitespace-pre-line">
              {note}
            </span>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Party({
  title,
  party,
  vatLabel,
}: {
  title: string;
  party: EInvoiceParty;
  vatLabel: string;
}) {
  const place = [party.postalCode, party.city].filter(Boolean).join(' ');
  return (
    <div className="border-border flex flex-col gap-0.5 rounded-md border p-3">
      <span className="text-muted-foreground text-xs">{title}</span>
      <span className="font-medium">{party.name || '—'}</span>
      {party.street ? <span>{party.street}</span> : null}
      {place || party.country ? (
        <span>{[place, party.country].filter(Boolean).join(', ')}</span>
      ) : null}
      {party.vatId ? (
        <span className="text-muted-foreground">
          {vatLabel}: {party.vatId}
        </span>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <dt className={strong ? 'font-semibold' : 'text-muted-foreground'}>{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </>
  );
}
