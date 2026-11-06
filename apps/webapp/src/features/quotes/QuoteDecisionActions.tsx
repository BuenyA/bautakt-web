import { type CurrencyCode, eurosToMinor, formatMoney } from '@bautakt/finance';
import {
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Checkbox,
  DrawerBody,
  DrawerHeader,
  Label,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Radio,
  RadioGroup,
  Select,
  Textarea,
} from '@fluentui/react-components';
import {
  ArrowUndoRegular,
  CheckmarkCircleRegular,
  MoreHorizontalRegular,
} from '@fluentui/react-icons';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker, TimeInput } from '@/components/form/dateTime';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';

import {
  ACCEPT_KINDS,
  decidedAtIso,
  type DecisionKind,
  DECLINE_KINDS,
  EVIDENCE_TYPES,
  isInFuture,
  localDateTimeParts,
  needsEvidence,
  toggleSelection,
} from './quoteDecision';
import { SignaturePad } from './SignaturePad';
import {
  useAcceptQuote,
  useDeclineQuote,
  useRevertQuoteDecision,
  useSelectableItems,
  useWithdrawQuote,
} from './useQuoteDecision';

type IssuedVersion = { id: string; version_no: number; currency: string };
type Mode = 'accept' | 'decline' | 'withdraw' | 'revert';

/**
 * Entscheidung erfassen (bautakt-app#186). Offen: annehmen als Hauptaktion,
 * ablehnen und zurückziehen im Menü. Entschieden: zurücknehmen, nur mit
 * Begründung. Ohne `canDecideQuotes` erscheint nichts; die Datenbank prüft
 * dasselbe Recht.
 */
export function QuoteDecisionActions({
  quoteId,
  decided,
  issuedVersions,
  consumer,
  consumerAcceptanceEnabled,
}: {
  quoteId: string;
  decided: boolean;
  issuedVersions: IssuedVersion[];
  /** Kunde ist Verbraucher (Person ohne USt-IdNr.). */
  consumer: boolean;
  /** Plattform hat die Annahme durch Verbraucher freigeschaltet (Standard aus). */
  consumerAcceptanceEnabled: boolean;
}) {
  const { t } = useTranslation();
  const canDecide = usePermission('canDecideQuotes');
  const [mode, setMode] = useState<Mode | null>(null);

  if (!canDecide || issuedVersions.length === 0) return null;
  const close = () => setMode(null);

  return (
    <>
      {decided ? (
        <Button icon={<ArrowUndoRegular />} onClick={() => setMode('revert')}>
          {t('domain:quotes.decision.revert')}
        </Button>
      ) : (
        <>
          <Button
            appearance="primary"
            icon={<CheckmarkCircleRegular />}
            onClick={() => setMode('accept')}
          >
            {t('domain:quotes.decision.accept')}
          </Button>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                icon={<MoreHorizontalRegular />}
                aria-label={t('domain:quotes.decision.more')}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setMode('decline')}>
                  {t('domain:quotes.decision.decline')}
                </MenuItem>
                <MenuItem onClick={() => setMode('withdraw')}>
                  {t('domain:quotes.decision.withdraw')}
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      )}

      <FormDrawer open={mode !== null} onOpenChange={(open) => (open ? null : close())}>
        {mode === 'accept' ? (
          <AcceptForm
            quoteId={quoteId}
            versions={issuedVersions}
            consumer={consumer}
            consumerBlocked={consumer && !consumerAcceptanceEnabled}
            onDone={close}
          />
        ) : null}
        {mode === 'decline' ? <DeclineForm quoteId={quoteId} onDone={close} /> : null}
        {mode === 'withdraw' ? <WithdrawForm quoteId={quoteId} onDone={close} /> : null}
        {mode === 'revert' ? <RevertForm quoteId={quoteId} onDone={close} /> : null}
      </FormDrawer>
    </>
  );
}

function useDecidedAt() {
  const [parts, setParts] = useState(() => localDateTimeParts(new Date()));
  const iso = decidedAtIso(parts.date, parts.time);
  return {
    parts,
    setDate: (date: string) => setParts((current) => ({ ...current, date })),
    setTime: (time: string) => setParts((current) => ({ ...current, time })),
    iso,
    future: iso ? isInFuture(iso, new Date()) : false,
  };
}

function DecidedAtFields({ state }: { state: ReturnType<typeof useDecidedAt> }) {
  const { t } = useTranslation();
  const dateId = useId();
  const timeId = useId();
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor={dateId}>{t('domain:quotes.decision.decidedOn')}</Label>
          <DatePicker
            id={dateId}
            aria-label={t('domain:quotes.decision.decidedOn')}
            value={state.parts.date}
            onChange={state.setDate}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={timeId}>{t('domain:quotes.decision.decidedTime')}</Label>
          <TimeInput
            id={timeId}
            aria-label={t('domain:quotes.decision.decidedTime')}
            value={state.parts.time}
            onChange={state.setTime}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{t('domain:quotes.decision.decidedHint')}</p>
      {state.future ? (
        <p className="text-destructive text-sm">{t('domain:quotes.decision.futureError')}</p>
      ) : null}
    </div>
  );
}

function FormShell({
  title,
  description,
  error,
  submitLabel,
  pending,
  disabled,
  onSubmit,
  onDone,
  children,
}: {
  title: string;
  description: string;
  error: string | null;
  submitLabel: string;
  pending: boolean;
  disabled?: boolean;
  onSubmit: () => Promise<void>;
  onDone: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  function submit(event: FormEvent) {
    event.preventDefault();
    void onSubmit();
  }
  return (
    <form onSubmit={submit} className="flex h-full min-h-0 w-full flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>{title}</FormDrawerTitle>
        <FormDrawerDescription>{description}</FormDrawerDescription>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-4">
        {children}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </DrawerBody>
      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={pending || disabled}>
          {submitLabel}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

function NoteField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
    </div>
  );
}

function AcceptForm({
  quoteId,
  versions,
  consumer,
  consumerBlocked,
  onDone,
}: {
  quoteId: string;
  versions: IssuedVersion[];
  consumer: boolean;
  consumerBlocked: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const accept = useAcceptQuote();
  const versionFieldId = useId();
  const fileId = useId();
  const [versionId, setVersionId] = useState(versions[0]!.id);
  const [kind, setKind] = useState<DecisionKind>('mail');
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<Blob | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const decidedAt = useDecidedAt();
  const items = useSelectableItems(versionId);
  const currency = (versions.find((version) => version.id === versionId)?.currency ??
    'EUR') as CurrencyCode;

  function changeKind(next: DecisionKind) {
    setKind(next);
    setEvidence(null);
  }

  async function onSubmit() {
    setError(null);
    if (!decidedAt.iso || decidedAt.future) {
      setError(t('domain:quotes.decision.decidedAtError'));
      return;
    }
    if (needsEvidence(kind) && !evidence) {
      setError(t(`domain:quotes.decision.evidenceMissing.${kind}`));
      return;
    }
    try {
      await accept.mutateAsync({
        quoteId,
        versionId,
        kind,
        decidedAt: decidedAt.iso,
        note: note.trim(),
        selectedItemIds: [...selected],
        evidence: needsEvidence(kind) ? evidence : null,
      });
      toast.success(t('domain:quotes.decision.accepted'));
      onDone();
    } catch (cause) {
      setError(readableDbError(cause) ?? t('domain:quotes.decision.saveError'));
    }
  }

  return (
    <FormShell
      title={t('domain:quotes.decision.acceptTitle')}
      description={t('domain:quotes.decision.acceptDescription')}
      error={error}
      submitLabel={t('domain:quotes.decision.acceptSubmit')}
      pending={accept.isPending}
      disabled={consumerBlocked}
      onSubmit={onSubmit}
      onDone={onDone}
    >
      {consumerBlocked ? (
        <p className="text-warning text-sm">{t('domain:quotes.decision.consumerBlocked')}</p>
      ) : null}
      {consumer && !consumerBlocked ? (
        // Rechtsprüfung offen (Owner-Entscheidung 2026-11-03): Text trägt die Markierung.
        <p className="text-warning text-sm">{t('domain:quotes.decision.consumerWithdrawal')}</p>
      ) : null}

      {versions.length > 1 ? (
        <div className="grid gap-2">
          <Label htmlFor={versionFieldId}>{t('domain:quotes.decision.version')}</Label>
          <Select
            id={versionFieldId}
            value={versionId}
            onChange={(_, data) => {
              setVersionId(data.value);
              setSelected(new Set());
            }}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {t('domain:quotes.workspace.versionLabel', { number: version.version_no })}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label>{t('domain:quotes.decision.kindLabel')}</Label>
        <RadioGroup value={kind} onChange={(_, data) => changeKind(data.value as DecisionKind)}>
          {ACCEPT_KINDS.map((value) => (
            <Radio key={value} value={value} label={t(`domain:quotes.decision.kind.${value}`)} />
          ))}
        </RadioGroup>
      </div>

      {kind === 'signature' ? <SignaturePad onChange={setEvidence} /> : null}
      {kind === 'paper' ? (
        <div className="grid gap-2">
          <Label htmlFor={fileId} required>
            {t('domain:quotes.decision.paperFile')}
          </Label>
          <input
            id={fileId}
            type="file"
            accept={EVIDENCE_TYPES.join(',')}
            onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
          />
        </div>
      ) : null}

      <DecidedAtFields state={decidedAt} />

      {items.data && items.data.length > 0 ? (
        <div className="grid gap-2">
          <Label>{t('domain:quotes.decision.selection')}</Label>
          <p className="text-muted-foreground text-sm">
            {t('domain:quotes.decision.selectionHint')}
          </p>
          {items.data.map((item) => (
            <Checkbox
              key={item.id}
              checked={selected.has(item.id)}
              onChange={() =>
                setSelected((current) => toggleSelection(items.data, current, item.id))
              }
              label={t('domain:quotes.decision.selectionItem', {
                oz: item.oz || '',
                text: item.short_text,
                kind: t(`domain:quotes.decision.positionType.${item.position_type}`),
                amount: formatMoney(
                  eurosToMinor(Number(item.quantity) * Number(item.unit_price)),
                  currency,
                ),
              })}
            />
          ))}
        </div>
      ) : null}

      <NoteField label={t('domain:quotes.decision.note')} value={note} onChange={setNote} />
    </FormShell>
  );
}

function DeclineForm({ quoteId, onDone }: { quoteId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const decline = useDeclineQuote();
  const kindId = useId();
  const [kind, setKind] = useState<DecisionKind | ''>('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decidedAt = useDecidedAt();

  async function onSubmit() {
    setError(null);
    if (!decidedAt.iso || decidedAt.future) {
      setError(t('domain:quotes.decision.decidedAtError'));
      return;
    }
    try {
      await decline.mutateAsync({
        quoteId,
        kind: kind || null,
        decidedAt: decidedAt.iso,
        reason: reason.trim(),
        note: note.trim(),
      });
      toast.success(t('domain:quotes.decision.declined'));
      onDone();
    } catch (cause) {
      setError(readableDbError(cause) ?? t('domain:quotes.decision.saveError'));
    }
  }

  return (
    <FormShell
      title={t('domain:quotes.decision.declineTitle')}
      description={t('domain:quotes.decision.declineDescription')}
      error={error}
      submitLabel={t('domain:quotes.decision.declineSubmit')}
      pending={decline.isPending}
      onSubmit={onSubmit}
      onDone={onDone}
    >
      <div className="grid gap-2">
        <Label htmlFor={kindId}>{t('domain:quotes.decision.kindLabel')}</Label>
        <Select
          id={kindId}
          value={kind}
          onChange={(_, data) => setKind(data.value as DecisionKind | '')}
        >
          <option value="">{t('domain:quotes.decision.kindUnknown')}</option>
          {DECLINE_KINDS.map((value) => (
            <option key={value} value={value}>
              {t(`domain:quotes.decision.kind.${value}`)}
            </option>
          ))}
        </Select>
      </div>
      <DecidedAtFields state={decidedAt} />
      <NoteField label={t('domain:quotes.decision.reason')} value={reason} onChange={setReason} />
      <NoteField label={t('domain:quotes.decision.note')} value={note} onChange={setNote} />
    </FormShell>
  );
}

function WithdrawForm({ quoteId, onDone }: { quoteId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const withdraw = useWithdrawQuote();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await withdraw.mutateAsync({ quoteId, note: note.trim() });
      toast.success(t('domain:quotes.decision.withdrawn'));
      onDone();
    } catch (cause) {
      setError(readableDbError(cause) ?? t('domain:quotes.decision.saveError'));
    }
  }

  return (
    <FormShell
      title={t('domain:quotes.decision.withdrawTitle')}
      description={t('domain:quotes.decision.withdrawDescription')}
      error={error}
      submitLabel={t('domain:quotes.decision.withdrawSubmit')}
      pending={withdraw.isPending}
      onSubmit={onSubmit}
      onDone={onDone}
    >
      <NoteField label={t('domain:quotes.decision.note')} value={note} onChange={setNote} />
    </FormShell>
  );
}

function RevertForm({ quoteId, onDone }: { quoteId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const revert = useRevertQuoteDecision();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!reason.trim()) {
      setError(t('domain:quotes.decision.revertReasonMissing'));
      return;
    }
    try {
      await revert.mutateAsync({ quoteId, reason: reason.trim() });
      toast.success(t('domain:quotes.decision.reverted'));
      onDone();
    } catch (cause) {
      setError(readableDbError(cause) ?? t('domain:quotes.decision.saveError'));
    }
  }

  return (
    <FormShell
      title={t('domain:quotes.decision.revertTitle')}
      description={t('domain:quotes.decision.revertDescription')}
      error={error}
      submitLabel={t('domain:quotes.decision.revertSubmit')}
      pending={revert.isPending}
      onSubmit={onSubmit}
      onDone={onDone}
    >
      <NoteField
        label={t('domain:quotes.decision.revertReason')}
        value={reason}
        onChange={setReason}
        required
      />
    </FormShell>
  );
}
