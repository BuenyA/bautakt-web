import {
  formatMoney,
  fromMinorUnits,
  parseMoneyInput,
  percentOf,
  todayIso,
} from '@bautakt/finance';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

const VAT_RATES = ['19', '7', '0'] as const;

/** Kostenkategorien des Betriebs — Pflichtfeld einer Ausgabe. */
function useCostCategories() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['cost-categories', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name, kind')
        .eq('company_id', companyId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

function useCreateExpense() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: {
      title: string;
      vendor: string;
      categoryId: string;
      invoiceDate: string;
      netMinor: number;
      vatRate: number;
      isCalculatory: boolean;
      notes: string;
    }) => {
      const { error } = await supabase.from('expenses').insert({
        company_id: companyId!,
        title: draft.title.trim(),
        vendor: draft.vendor.trim(),
        cost_category_id: draft.categoryId,
        invoice_date: draft.invoiceDate,
        amount_net: fromMinorUnits(draft.netMinor),
        // Die USt aus Netto und Satz, kaufmaennisch gerundet — nicht vom Nutzer
        // getippt: zwei Felder, die nicht zusammenpassen, sind die haeufigste
        // Fehlerquelle einer Belegerfassung.
        vat_amount: fromMinorUnits(percentOf(draft.netMinor, draft.vatRate)),
        vat_rate: draft.vatRate,
        is_calculatory: draft.isCalculatory,
        notes: draft.notes.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses', companyId] });
    },
  });
}

/** Ausgabe erfassen — Gemeinkosten, Material, sonstige Belege. */
export function ExpenseSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open ? <ExpenseForm onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const create = useCreateExpense();
  const categories = useCostCategories();
  const ids = { title: useId(), vendor: useId(), date: useId(), net: useId(), notes: useId() };

  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso);
  const [net, setNet] = useState('');
  const [vatRate, setVatRate] = useState<string>('19');
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const netMinor = parseMoneyInput(net) ?? 0;
  const vatMinor = percentOf(netMinor, Number(vatRate));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError(t('domain:expenseForm.titleRequired'));
      return;
    }
    if (!categoryId) {
      setError(t('domain:expenseForm.categoryRequired'));
      return;
    }
    if (netMinor <= 0) {
      setError(t('domain:expenseForm.amountRequired'));
      return;
    }

    try {
      await create.mutateAsync({
        title,
        vendor,
        categoryId,
        invoiceDate,
        netMinor,
        vatRate: Number(vatRate),
        isCalculatory: false,
        notes,
      });
      toast.success(t('domain:expenseForm.saved'));
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('domain:expenseForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{t('domain:expenseForm.title')}</SheetTitle>
        <SheetDescription>{t('domain:expenseForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={ids.title}>{t('domain:expenses.columns.title')}</Label>
          <Input id={ids.title} value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.vendor}>{t('domain:expenses.columns.vendor')}</Label>
          <Input
            id={ids.vendor}
            value={vendor}
            onChange={(event) => setVendor(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>{t('domain:expenses.columns.category')}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('domain:timeForm.choose')} />
            </SelectTrigger>
            <SelectContent>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.date}>{t('domain:expenses.columns.date')}</Label>
          <Input
            id={ids.date}
            type="date"
            value={invoiceDate}
            onChange={(event) => setInvoiceDate(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.net}>{t('domain:expenses.columns.net')}</Label>
            <Input
              id={ids.net}
              inputMode="decimal"
              className="text-right tabular-nums"
              placeholder="0,00"
              value={net}
              onChange={(event) => setNet(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t('domain:expenseForm.vatRate')}</Label>
            <Select value={vatRate} onValueChange={setVatRate}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VAT_RATES.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate} %
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <dl className="border-border flex flex-col gap-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('domain:invoices.vat')}</dt>
            <dd className="tabular-nums">{formatMoney(vatMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground font-medium">{t('domain:invoices.gross')}</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(netMinor + vatMinor)}</dd>
          </div>
        </dl>

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:customerForm.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}
