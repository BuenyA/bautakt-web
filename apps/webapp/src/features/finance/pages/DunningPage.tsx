import {
  buildReceivables,
  formatMoney,
  fromMinorUnits,
  parseMoneyInput,
  type ReceivableItem,
  todayIso,
} from '@bautakt/finance';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@bautakt/ui';
import { type FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { useCreateDunningNotice, useDunningLevels } from '../useDunning';
import { useFinanceAccess } from '../useFinanceAccess';
import { INVOICE_TYPE_LIST, usePayments, useSalesDocuments } from '../useSalesDocuments';

type DunnableRow = ReceivableItem & { level: number };

/**
 * Mahnwesen: ueberfaellige Belege mit ihrer bisherigen Mahnstufe.
 *
 * Eine Mahnung ist eine Nachricht an einen Kunden und laesst sich nicht
 * zuruecknehmen — deshalb fragt die Seite vor dem Anlegen nach, statt es auf
 * einen Klick hin zu tun.
 */
export function DunningPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const access = useFinanceAccess();

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const levels = useDunningLevels();
  const createNotice = useCreateDunningNotice();

  const [pending, setPending] = useState<DunnableRow | null>(null);
  const [fee, setFee] = useState('');
  const [interest, setInterest] = useState('');

  const isLoading = useCompanyListLoading(documents, payments, levels);

  const rows = useMemo<DunnableRow[]>(() => {
    const items = buildReceivables(documents.data ?? [], payments.data ?? []);
    return items
      .filter((item) => item.daysOverdue > 0)
      .map((item) => ({ ...item, level: levels.data?.get(item.document.id) ?? 0 }));
  }, [documents.data, payments.data, levels.data]);

  function openFor(row: DunnableRow) {
    setFee('');
    setInterest('');
    setPending(row);
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!pending) return;
    const nextLevel = pending.level + 1;
    try {
      await createNotice.mutateAsync({
        documentId: pending.document.id,
        level: nextLevel,
        noticeDateIso: todayIso(),
        feeAmount: fromMinorUnits(parseMoneyInput(fee) ?? 0),
        interestAmount: fromMinorUnits(parseMoneyInput(interest) ?? 0),
      });
      toast.success(t('domain:dunning.created', { level: nextLevel }));
      setPending(null);
    } catch (error) {
      // Der Dialog bleibt im Fehlerfall offen: sonst waeren die eingetippte
      // Gebuehr und die Zinsen weg, und der Nutzer muesste raten, was schieflief.
      toast.error(t('domain:dunning.createError'), {
        description: readableDbError(error) ?? undefined,
      });
    }
  }

  const columns = useMemo<DataTableColumn<DunnableRow>[]>(
    () => [
      {
        id: 'number',
        accessorFn: (row) => row.document.document_number ?? '',
        header: t('domain:receivables.columns.number'),
        cell: ({ row }) => (
          <Link
            to={routes.invoice(row.original.document.id)}
            className="text-foreground hover:text-primary font-medium whitespace-nowrap hover:underline"
          >
            {row.original.document.document_number || t('domain:invoices.noNumber')}
          </Link>
        ),
      },
      {
        id: 'due',
        accessorFn: (row) => row.document.due_date ?? '',
        header: t('domain:receivables.columns.due'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.document.due_date)}
          </span>
        ),
      },
      {
        accessorKey: 'daysOverdue',
        header: t('domain:receivables.columns.daysOverdue'),
        cell: ({ row }) => (
          <span className="text-destructive tabular-nums">
            {t('domain:receivables.days', { count: row.original.daysOverdue })}
          </span>
        ),
      },
      {
        accessorKey: 'level',
        header: t('domain:dunning.columns.level'),
        cell: ({ row }) =>
          row.original.level === 0 ? (
            <Badge variant="muted">{t('domain:dunning.noNotice')}</Badge>
          ) : (
            <Badge variant="warning">
              {t('domain:dunning.levelLabel', { level: row.original.level })}
            </Badge>
          ),
      },
      {
        accessorKey: 'openMinor',
        header: t('domain:receivables.columns.open'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(row.original.openMinor)}
          </span>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) =>
          access.canWriteSalesDocuments ? (
            <span className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => openFor(row.original)}>
                {t('domain:dunning.createAction', { level: row.original.level + 1 })}
              </Button>
            </span>
          ) : null,
      },
    ],
    [t, access.canWriteSalesDocuments],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('domain:dunning.title')} description={t('domain:dunning.description')} />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="mahnwesen"
        empty={
          <EmptyState
            title={t('domain:dunning.emptyTitle')}
            description={t('domain:dunning.emptyDescription')}
          />
        }
      />

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <form onSubmit={(event) => void onConfirm(event)} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>
                {t('domain:dunning.confirmTitle', { level: (pending?.level ?? 0) + 1 })}
              </DialogTitle>
              <DialogDescription>
                {t('domain:dunning.confirmDescription', {
                  number: pending?.document.document_number ?? '',
                  amount: formatMoney(pending?.openMinor ?? 0),
                })}
              </DialogDescription>
            </DialogHeader>

            {/* Bewusst ohne Vorbelegung: Gebuehr und Zinsen haengen an Vertrag
                und Verzugsdauer. Ein geratener Standardwert landete sonst
                ungeprueft auf der Mahnung. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="mahngebuehr">{t('domain:dunning.fee')}</Label>
                <Input
                  id="mahngebuehr"
                  inputMode="decimal"
                  className="text-right tabular-nums"
                  placeholder="0,00"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="verzugszinsen">{t('domain:dunning.interest')}</Label>
                <Input
                  id="verzugszinsen"
                  inputMode="decimal"
                  className="text-right tabular-nums"
                  placeholder="0,00"
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPending(null)}>
                {t('common:action.cancel')}
              </Button>
              <Button type="submit" disabled={createNotice.isPending}>
                {t('domain:dunning.confirmAction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
