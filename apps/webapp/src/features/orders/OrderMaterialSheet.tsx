import {
  Badge,
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
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { useArticles } from '@/features/masterdata/useMasterData';
import { readableDbError } from '@/lib/dbErrors';
import { formatCurrency } from '@/lib/format';

import { OrderMaterialDeleteDialog } from './OrderMaterialDeleteDialog';
import {
  applyArticle,
  finiteOrNull,
  type OrderMaterialDraft,
  type OrderMaterialIssue,
  orderMaterialIssue,
  type OrderMaterialMode,
} from './orderMaterialDraft';
import { OrderMaterialBilledError, useSaveOrderMaterial } from './useOrderMaterialMutations';

const ISSUE_KEY = {
  article: 'domain:materialForm.articleRequired',
  title: 'domain:materialForm.titleRequired',
  quantity: 'domain:materialForm.quantityRequired',
  cost: 'domain:materialForm.costRequired',
  price: 'domain:materialForm.priceInvalid',
  date: 'domain:materialForm.dateRequired',
} as const satisfies Record<OrderMaterialIssue, string>;

/**
 * Material anlegen oder bearbeiten.
 *
 * Das Panel ist nur gemountet, solange es offen ist, und startet deshalb
 * jedes Mal mit dem übergebenen Entwurf. Abgerechnete Zeilen zeigen den
 * Hinweis und keinen Speichern-Knopf. Löschen sitzt im selben Panel.
 */
export function OrderMaterialSheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: OrderMaterialDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dismiss = useDismissLock(onOpenChange);
  return (
    <Sheet open={open} onOpenChange={dismiss.handleOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? (
          <OrderMaterialForm
            initial={draft}
            onBusyChange={dismiss.onBusyChange}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function OrderMaterialForm({
  initial,
  onBusyChange,
  onDone,
}: {
  initial: OrderMaterialDraft;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveOrderMaterial();
  const articles = useArticles();
  const [draft, setDraft] = useState<OrderMaterialDraft>(initial);
  // Feldfehler erst nach dem ersten Speichern. Danach hängt die Meldung am
  // aktuellen Entwurf und verschwindet, sobald das Feld stimmt.
  const [revealIssues, setRevealIssues] = useState(false);
  const [revealPulse, setRevealPulse] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const ids = {
    title: useId(),
    quantity: useId(),
    unit: useId(),
    cost: useId(),
    price: useId(),
    date: useId(),
    notes: useId(),
  };

  const issue = revealIssues && !draft.billed ? orderMaterialIssue(draft) : null;
  const error = saveError;
  const locked = draft.billed;
  const busy = save.isPending || deletePending;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => onBusyChange(false);
  }, [onBusyChange]);

  const catalog = [...(articles.data ?? [])]
    .filter((article) => article.is_active || article.id === draft.articleId)
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));
  const selected = catalog.find((article) => article.id === draft.articleId);
  const activeCount = (articles.data ?? []).filter((article) => article.is_active).length;
  const articleSelectKey =
    !draft.articleId || catalog.some((article) => article.id === draft.articleId)
      ? 'ready'
      : 'pending';

  useEffect(() => {
    if (!issue) return;
    document.querySelector(`[data-material-field="${issue}"]`)?.scrollIntoView({ block: 'center' });
  }, [issue, revealPulse]);

  function set(patch: Partial<OrderMaterialDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveError(null);
  }

  function setMode(mode: OrderMaterialMode) {
    setDraft((current) => ({
      ...current,
      mode,
      articleId: mode === 'custom' ? '' : current.articleId,
      customTitle: mode === 'article' ? '' : current.customTitle,
    }));
    setSaveError(null);
  }

  function onArticle(id: string) {
    const article = (articles.data ?? []).find((row) => row.id === id);
    if (!article) {
      set({ mode: 'article', articleId: id, customTitle: '' });
      return;
    }
    setDraft((current) =>
      applyArticle(current, {
        id: article.id,
        unit: article.unit,
        salePrice: finiteOrNull(article.sale_price),
        purchasePrice: finiteOrNull(article.purchase_price),
      }),
    );
    setSaveError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;

    const nextIssue = orderMaterialIssue(draft);
    if (nextIssue) {
      setRevealIssues(true);
      setRevealPulse((pulse) => pulse + 1);
      setSaveError(null);
      return;
    }
    setRevealIssues(false);

    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:materialForm.saved'));
      onDone();
    } catch (caught) {
      if (caught instanceof OrderMaterialBilledError) {
        setSaveError(t('domain:materialForm.billedHint'));
        return;
      }
      if (caught instanceof Error && caught.message === 'INVALID_ORDER_MATERIAL') {
        setRevealIssues(true);
        setRevealPulse((pulse) => pulse + 1);
        return;
      }
      setSaveError(readableDbError(caught) ?? t('domain:materialForm.saveError'));
    }
  }

  const deleteLabel = (draft.mode === 'custom' ? draft.customTitle : selected?.title)?.trim() ?? '';

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>
          <span className="inline-flex flex-wrap items-center gap-2">
            {draft.id ? t('domain:materialForm.editTitle') : t('domain:materialForm.newTitle')}
            {draft.billed ? (
              <Badge variant="muted">{t('domain:orders.materials.billed')}</Badge>
            ) : null}
          </span>
        </SheetTitle>
        <SheetDescription>{t('domain:materialForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        {locked ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('domain:materialForm.billedHint')}
          </p>
        ) : null}

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('domain:materialForm.mode')}
        >
          <Button
            type="button"
            size="sm"
            variant={draft.mode === 'article' ? 'default' : 'outline'}
            disabled={locked}
            aria-pressed={draft.mode === 'article'}
            onClick={() => setMode('article')}
          >
            {t('domain:materialForm.modeCatalog')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={draft.mode === 'custom' ? 'default' : 'outline'}
            disabled={locked}
            aria-pressed={draft.mode === 'custom'}
            onClick={() => setMode('custom')}
          >
            {t('domain:materialForm.modeCustom')}
          </Button>
        </div>

        {draft.mode === 'article' ? (
          <div className="grid gap-2" data-material-field="article">
            <Label>{t('domain:materialForm.article')}</Label>
            <Select
              key={articleSelectKey}
              value={draft.articleId || undefined}
              onValueChange={onArticle}
              disabled={locked}
            >
              <SelectTrigger className="w-full" aria-invalid={issue === 'article'}>
                <SelectValue
                  placeholder={
                    articles.isPending
                      ? t('common:state.loading')
                      : t('domain:materialForm.chooseArticle')
                  }
                >
                  {selected ? articleOptionLabel(selected.title, selected.sale_price) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {catalog.map((article) => (
                  <SelectItem key={article.id} value={article.id}>
                    {articleOptionLabel(article.title, article.sale_price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {articles.isError ? (
              <p className="text-destructive text-sm">{t('domain:materialForm.articlesError')}</p>
            ) : !articles.isPending && activeCount === 0 ? (
              <p className="text-muted-foreground text-sm">{t('domain:materialForm.noArticles')}</p>
            ) : null}
            {issue === 'article' ? <FieldAlert message={t(ISSUE_KEY.article)} /> : null}
          </div>
        ) : (
          <div className="grid gap-2" data-material-field="title">
            <Label htmlFor={ids.title}>{t('domain:materialForm.title')}</Label>
            <Input
              id={ids.title}
              value={draft.customTitle}
              disabled={locked}
              aria-invalid={issue === 'title'}
              autoComplete="off"
              onChange={(event) => set({ customTitle: event.target.value })}
            />
            {issue === 'title' ? <FieldAlert message={t(ISSUE_KEY.title)} /> : null}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div className="grid gap-2" data-material-field="quantity">
            <Label htmlFor={ids.quantity}>{t('domain:materialForm.quantity')}</Label>
            <Input
              id={ids.quantity}
              inputMode="decimal"
              disabled={locked}
              aria-invalid={issue === 'quantity'}
              className="text-right tabular-nums"
              value={draft.quantity}
              onChange={(event) => set({ quantity: event.target.value })}
            />
            {issue === 'quantity' ? <FieldAlert message={t(ISSUE_KEY.quantity)} /> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.unit}>{t('domain:materialForm.unit')}</Label>
            <Input
              id={ids.unit}
              disabled={locked}
              autoComplete="off"
              value={draft.unit}
              onChange={(event) => set({ unit: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2" data-material-field="cost">
            <Label htmlFor={ids.cost}>{t('domain:materialForm.unitCost')}</Label>
            <Input
              id={ids.cost}
              inputMode="decimal"
              disabled={locked}
              aria-invalid={issue === 'cost'}
              className="text-right tabular-nums"
              value={draft.unitCost}
              onChange={(event) => set({ unitCost: event.target.value })}
            />
            {issue === 'cost' ? <FieldAlert message={t(ISSUE_KEY.cost)} /> : null}
          </div>
          <div className="grid gap-2" data-material-field="price">
            <Label htmlFor={ids.price}>{t('domain:materialForm.unitPrice')}</Label>
            <Input
              id={ids.price}
              inputMode="decimal"
              disabled={locked}
              aria-invalid={issue === 'price'}
              className="text-right tabular-nums"
              value={draft.unitPrice}
              onChange={(event) => set({ unitPrice: event.target.value })}
            />
            {issue === 'price' ? <FieldAlert message={t(ISSUE_KEY.price)} /> : null}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{t('domain:materialForm.priceHint')}</p>

        <div className="grid gap-2" data-material-field="date">
          <Label htmlFor={ids.date}>{t('domain:materialForm.usedAt')}</Label>
          <Input
            id={ids.date}
            type="date"
            disabled={locked}
            aria-invalid={issue === 'date'}
            value={draft.usedAt}
            onChange={(event) => set({ usedAt: event.target.value })}
          />
          {issue === 'date' ? <FieldAlert message={t(ISSUE_KEY.date)} /> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.notes}>{t('domain:materialForm.notes')}</Label>
          <Textarea
            id={ids.notes}
            rows={3}
            disabled={locked}
            value={draft.notes}
            onChange={(event) => set({ notes: event.target.value })}
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </SheetBody>

      <SheetFooter className="sm:flex-wrap">
        {draft.id && !locked ? (
          <Button
            type="button"
            variant="destructive"
            className="sm:mr-auto"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            {t('domain:materialForm.delete.action')}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          {t('common:action.cancel')}
        </Button>
        {locked ? null : (
          <Button type="submit" disabled={busy}>
            {t('common:action.save')}
          </Button>
        )}
      </SheetFooter>

      {draft.id ? (
        <OrderMaterialDeleteDialog
          materialId={draft.id}
          label={deleteLabel}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onPendingChange={setDeletePending}
          onDeleted={onDone}
        />
      ) : null}
    </form>
  );
}

function FieldAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

function articleOptionLabel(title: string, salePrice: number | null): string {
  const name = title.trim();
  const price = finiteOrNull(salePrice);
  if (price == null) return name;
  return `${name} · ${formatCurrency(price)}`;
}
