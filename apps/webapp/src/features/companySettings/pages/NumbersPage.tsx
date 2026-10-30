import { SkeletonBlock, toast } from '@bautakt/ui';
import {
  Field,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import { LockClosed16Regular } from '@fluentui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { useMembership } from '@/features/company/useMembership';
import { ContactNumberSettingsCard } from '@/features/contacts/ContactNumberSettingsCard';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { useCompanyAccess } from '../companyAccess';
import { useCardForm, useSave, useUpdateCompany } from '../companyForm';
import { FormCard } from '../FormCard';
import { SectionGuard } from '../SectionGuard';
import { useCompanyRecord } from '../useCompanyRecord';

/** Belegarten in der Reihenfolge, in der ein Auftrag sie durchläuft. */
const DOC_TYPES = [
  'quote',
  'order_confirmation',
  'delivery_note',
  'invoice',
  'partial_invoice',
  'final_invoice',
  'credit_note',
  'cancellation',
] as const;
type DocType = (typeof DOC_TYPES)[number];

type Sequence = { prefix: string; next: number; issued: boolean };

/**
 * So formatiert `finalize_sales_document` die Nummer: mit Präfix fünfstellig
 * aufgefüllt, ohne Präfix die nackte Zahl.
 */
function formatDocumentNumber(prefix: string, next: number): string {
  const clean = prefix.trim();
  return clean ? `${clean}${String(next).padStart(5, '0')}` : String(next);
}

/**
 * Nummernkreise je Belegart und ob dort schon eine Nummer vergeben ist. Nur
 * dann ist der Kreis gesperrt: `set_document_number_start` lehnt sonst ab
 * (GoBD, § 14 UStG — keine Lücken, keine Dubletten).
 */
function useDocumentSequences() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['document-number-sequences', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<Record<DocType, Sequence>> => {
      const [sequences, ...issued] = await Promise.all([
        supabase
          .from('document_number_sequences')
          .select('doc_type, prefix, next_number')
          .eq('company_id', companyId!),
        ...DOC_TYPES.map((type) =>
          supabase
            .from('sales_documents')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId!)
            .eq('type', type)
            .not('document_number', 'is', null),
        ),
      ]);
      if (sequences.error) throw sequences.error;
      const failed = issued.find((result) => result.error);
      if (failed?.error) throw failed.error;

      const rows = new Map((sequences.data ?? []).map((row) => [row.doc_type, row]));
      return Object.fromEntries(
        DOC_TYPES.map((type, index) => [
          type,
          {
            prefix: rows.get(type)?.prefix ?? '',
            next: rows.get(type)?.next_number ?? 1,
            issued: (issued[index]?.count ?? 0) > 0,
          },
        ]),
      ) as Record<DocType, Sequence>;
    },
  });
}

type Draft = Record<DocType, { prefix: string; next: string }>;

function toDraft(sequences: Record<DocType, Sequence>): Draft {
  return Object.fromEntries(
    DOC_TYPES.map((type) => [
      type,
      { prefix: sequences[type].prefix, next: String(sequences[type].next) },
    ]),
  ) as Draft;
}

function SequencesCard({
  sequences,
  canEdit,
}: {
  sequences: Record<DocType, Sequence>;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const initial = toDraft(sequences);
  const [draft, setDraft] = useState<Draft>(initial);
  const changed = DOC_TYPES.filter(
    (type) =>
      !sequences[type].issued &&
      (draft[type].prefix !== initial[type].prefix || draft[type].next !== initial[type].next),
  );
  const invalid = DOC_TYPES.filter((type) => {
    const value = draft[type].next.trim();
    return !/^\d+$/.test(value) || Number(value) < 1;
  });

  const save = useMutation({
    mutationFn: async () => {
      // Nacheinander: jede Belegart ist ein eigener Aufruf der RPC.
      for (const type of changed) {
        const { error } = await supabase.rpc('set_document_number_start', {
          p_company_id: companyId!,
          p_doc_type: type,
          p_prefix: draft[type].prefix.trim(),
          p_next: Number(draft[type].next),
        });
        if (error) throw error;
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['document-number-sequences', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
    },
  });

  return (
    <FormCard
      title={t('companySettings:numbers.documents')}
      description={t('companySettings:numbers.documentsHint')}
      canEdit={canEdit}
      dirty={changed.length > 0}
      saving={save.isPending}
      onReset={() => setDraft(initial)}
      onSave={() => {
        if (changed.some((type) => invalid.includes(type))) return;
        save.mutate(undefined, {
          onSuccess: () => toast.success(t('domain:settings.saved')),
          onError: (caught) =>
            toast.error(t('domain:settings.saveError'), {
              description: readableDbError(caught) ?? undefined,
            }),
        });
      }}
    >
      <div className="overflow-x-auto">
        <Table size="small" aria-label={t('companySettings:numbers.documents')}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>{t('companySettings:numbers.type')}</TableHeaderCell>
              <TableHeaderCell>{t('companySettings:numbers.prefix')}</TableHeaderCell>
              <TableHeaderCell>{t('companySettings:numbers.next')}</TableHeaderCell>
              <TableHeaderCell>{t('companySettings:numbers.example')}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DOC_TYPES.map((type) => {
              const locked = sequences[type].issued;
              const row = draft[type];
              const disabled = !canEdit || locked;
              const nextInvalid = invalid.includes(type);
              return (
                <TableRow key={type}>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {t(`domain:documentType.${type}`)}
                      {locked ? (
                        <Tooltip
                          content={t('companySettings:numbers.locked')}
                          relationship="description"
                        >
                          <LockClosed16Regular
                            aria-label={t('companySettings:numbers.lockedShort')}
                          />
                        </Tooltip>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Input
                      size="small"
                      value={row.prefix}
                      disabled={disabled}
                      aria-label={`${t('companySettings:numbers.prefix')} ${t(`domain:documentType.${type}`)}`}
                      maxLength={12}
                      onChange={(_, d) =>
                        setDraft({
                          ...draft,
                          [type]: { ...row, prefix: d.value.replace(/\s/g, '') },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Field
                      validationMessage={
                        nextInvalid ? t('companySettings:numbers.nextInvalid') : undefined
                      }
                      validationState={nextInvalid ? 'error' : 'none'}
                    >
                      <Input
                        size="small"
                        value={row.next}
                        inputMode="numeric"
                        disabled={disabled}
                        aria-label={`${t('companySettings:numbers.next')} ${t(`domain:documentType.${type}`)}`}
                        onChange={(_, d) =>
                          setDraft({
                            ...draft,
                            [type]: { ...row, next: d.value.replace(/\D/g, '') },
                          })
                        }
                      />
                    </Field>
                  </TableCell>
                  <TableCell>
                    <Text font="monospace">
                      {nextInvalid ? '—' : formatDocumentNumber(row.prefix, Number(row.next))}
                    </Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </FormCard>
  );
}

function PaymentTermCard({ days, canEdit }: { days: number; canEdit: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateCompany();
  const form = useCardForm({ days: String(days) }, (v) => ({
    days:
      !/^\d+$/.test(v.days) || Number(v.days) > 365
        ? t('companySettings:numbers.paymentTermInvalid')
        : undefined,
  }));
  const save = useSave(update, form.reset);

  return (
    <FormCard
      title={t('companySettings:numbers.paymentTerm')}
      description={t('companySettings:numbers.paymentTermHint')}
      canEdit={canEdit}
      dirty={form.dirty}
      saving={update.isPending}
      onReset={form.reset}
      onSave={() => {
        form.submit();
        if (form.hasErrors) return;
        void save({ payment_term_days: Number(form.values.days) });
      }}
    >
      <Field
        label={t('companySettings:numbers.paymentTermDays')}
        validationMessage={form.errorFor('days')}
        className="max-w-48"
      >
        <Input
          value={form.values.days}
          inputMode="numeric"
          disabled={!canEdit}
          contentAfter={<Text size={200}>{t('companySettings:numbers.daysUnit')}</Text>}
          onChange={(_, d) => form.set({ days: d.value.replace(/\D/g, '') })}
        />
      </Field>
    </FormCard>
  );
}

/**
 * Nummernkreise der Belege und Kontakte, dazu das Standard-Zahlungsziel.
 *
 * Belegnummern sind nur änderbar, solange für die Belegart noch keine
 * vergeben ist; dann ist auch ein Startwert über 1 erlaubt (Umstieg von
 * einer anderen Software).
 */
export function NumbersPage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const sequences = useDocumentSequences();
  const company = useCompanyRecord();

  return (
    <SectionGuard allowed={access.numbers.view}>
      <SubPage
        title={t('companySettings:numbers.title')}
        description={t('companySettings:numbers.description')}
      >
        {sequences.data ? (
          <SequencesCard
            key={JSON.stringify(sequences.data)}
            sequences={sequences.data}
            canEdit={access.numbers.editSequences}
          />
        ) : (
          <SkeletonBlock className="h-72 w-full" />
        )}
        {company.data ? (
          <PaymentTermCard
            key={company.data.payment_term_days}
            days={company.data.payment_term_days}
            canEdit={access.numbers.edit}
          />
        ) : null}
        <ContactNumberSettingsCard />
      </SubPage>
    </SectionGuard>
  );
}
