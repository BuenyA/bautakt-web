import { todayIso } from '@bautakt/finance';
import {
  DangerIconButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  StatusBadge,
  toast,
} from '@bautakt/ui';
import {
  Button,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  Link,
  Text,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, DocumentRegular } from '@fluentui/react-icons';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/form/dateTime';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';

import { exemptionState } from './contactModel';
import { type ExemptionCertificate, useExemptionCertificates } from './useContact';
import {
  type ExemptionDraft,
  exemptionFileUrl,
  useDeleteExemption,
  useSaveExemption,
} from './useContactDetailMutations';

const STATE_TONE = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  missing: 'danger',
} as const;

/**
 * §48b-EStG-Freistellungsbescheinigungen eines Subunternehmers.
 *
 * Ohne gültige Bescheinigung am Zahlungstag müssen 15 % der Rechnung als
 * Bauabzugsteuer einbehalten werden. Erneuerungen sind neue Einträge — die
 * alte Bescheinigung bleibt, weil sie für frühere Zahlungen gilt.
 */
export function ExemptionCertificatesSection({
  contactId,
  canManage,
}: {
  contactId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const certificates = useExemptionCertificates(contactId);
  const remove = useDeleteExemption();
  const [draft, setDraft] = useState<ExemptionDraft | null>(null);
  const list = certificates.data ?? [];
  const state = exemptionState(list, todayIso());

  async function open(certificate: ExemptionCertificate) {
    if (!certificate.storage_path) return;
    try {
      window.open(await exemptionFileUrl(certificate.storage_path), '_blank', 'noopener');
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:exemptions.openError'));
    }
  }

  async function onDelete(certificate: ExemptionCertificate) {
    try {
      await remove.mutateAsync(certificate.id);
      toast.success(t('domain:exemptions.deleted'));
    } catch (caught) {
      toast.error(readableDbError(caught) ?? t('domain:exemptions.deleteError'));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Text weight="semibold">{t('domain:exemptions.title')}</Text>
          <StatusBadge tone={STATE_TONE[state]}>
            {t(`domain:exemptions.state.${state}`)}
          </StatusBadge>
        </span>
        {canManage ? (
          <Button
            appearance="subtle"
            icon={<AddRegular />}
            onClick={() =>
              setDraft({
                certificate_number: '',
                tax_office: '',
                valid_from: todayIso(),
                valid_until: '',
                storage_path: null,
                file: null,
              })
            }
          >
            {t('domain:exemptions.add')}
          </Button>
        ) : null}
      </div>

      {state !== 'valid' ? (
        <Text size={200} className="text-muted-foreground">
          {t('domain:exemptions.withholdingHint')}
        </Text>
      ) : null}

      {list.length > 0 ? (
        <ul className="divide-border flex flex-col divide-y text-sm">
          {list.map((certificate) => (
            <li key={certificate.id} className="flex items-center justify-between gap-3 py-2">
              <span className="flex flex-col">
                <span className="tabular-nums">
                  {formatDate(certificate.valid_from)} – {formatDate(certificate.valid_until)}
                </span>
                <span className="text-muted-foreground">
                  {[certificate.certificate_number, certificate.tax_office]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {certificate.storage_path ? (
                  <Link as="button" onClick={() => void open(certificate)}>
                    <DocumentRegular className="mr-1 inline size-4" />
                    {t('domain:exemptions.openFile')}
                  </Link>
                ) : null}
                {canManage ? (
                  <DangerIconButton
                    aria-label={t('common:action.delete')}
                    icon={<DeleteRegular />}
                    onClick={() => void onDelete(certificate)}
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <FormDrawer open={draft !== null} onOpenChange={(o) => !o && setDraft(null)} size="small">
        {draft ? (
          <ExemptionForm contactId={contactId} initial={draft} onDone={() => setDraft(null)} />
        ) : null}
      </FormDrawer>
    </div>
  );
}

function ExemptionForm({
  contactId,
  initial,
  onDone,
}: {
  contactId: string;
  initial: ExemptionDraft;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveExemption(contactId);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const set = (patch: Partial<ExemptionDraft>) => setDraft((d) => ({ ...d, ...patch }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.valid_from || !draft.valid_until) {
      setError(t('domain:exemptions.datesRequired'));
      return;
    }
    if (draft.valid_until < draft.valid_from) {
      setError(t('validation:endBeforeStart'));
      return;
    }
    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:exemptions.saved'));
      onDone();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:exemptions.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {t('domain:exemptions.newTitle')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:exemptions.description')}</FormDrawerDescription>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={f('from')}>{t('domain:exemptions.validFrom')}</Label>
            <DatePicker
              id={f('from')}
              aria-label={t('domain:exemptions.validFrom')}
              value={draft.valid_from}
              onChange={(v) => set({ valid_from: v })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={f('until')}>{t('domain:exemptions.validUntil')}</Label>
            <DatePicker
              id={f('until')}
              aria-label={t('domain:exemptions.validUntil')}
              value={draft.valid_until}
              onChange={(v) => set({ valid_until: v })}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={f('nr')}>{t('domain:exemptions.number')}</Label>
          <Input
            id={f('nr')}
            value={draft.certificate_number}
            onChange={(e) => set({ certificate_number: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={f('office')}>{t('domain:exemptions.taxOffice')}</Label>
          <Input
            id={f('office')}
            value={draft.tax_office}
            onChange={(e) => set({ tax_office: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={f('file')}>{t('domain:exemptions.file')}</Label>
          <input
            id={f('file')}
            type="file"
            accept="application/pdf,image/*"
            className="text-sm"
            onChange={(event) => set({ file: event.target.files?.[0] ?? null })}
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </DrawerBody>
      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={save.isPending}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}
