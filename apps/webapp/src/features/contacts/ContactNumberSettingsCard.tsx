import { toast } from '@bautakt/ui';
import { Button, Input, Label, Text } from '@fluentui/react-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

import { SectionCard } from './SectionCard';

type Kind = 'customer' | 'supplier';

/**
 * Nummernkreise für Kunden und Lieferanten. Die nächste freie Nummer vergibt
 * die Datenbank beim Anlegen einer Rolle; vergebene Nummern überspringt sie.
 * Den Start zu ändern ist deshalb jederzeit möglich — anders als bei
 * Rechnungsnummern, die lückenlos sein müssen.
 */
export function ContactNumberSettingsCard() {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const canEdit = usePermission('canEditCompanyMasterData');
  const queryClient = useQueryClient();

  const sequences = useQuery({
    queryKey: ['contact-number-sequences', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_number_sequences')
        .select('kind, next_number')
        .eq('company_id', companyId!);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((row) => [row.kind, row.next_number])) as Partial<
        Record<Kind, number>
      >;
    },
  });

  const save = useMutation({
    mutationFn: async ({ kind, next }: { kind: Kind; next: number }) => {
      const { error } = await supabase.rpc('set_contact_number_start', {
        p_company_id: companyId!,
        p_kind: kind,
        p_next: next,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['contact-number-sequences', companyId] }),
  });

  return (
    <SectionCard title={t('domain:contactNumbers.title')}>
      <Text size={200} className="text-muted-foreground">
        {t('domain:contactNumbers.description')}
      </Text>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['customer', 'supplier'] as const).map((kind) => (
          <NumberField
            key={kind}
            kind={kind}
            current={sequences.data?.[kind]}
            canEdit={canEdit}
            onSave={async (next) => {
              try {
                await save.mutateAsync({ kind, next });
                toast.success(t('domain:contactNumbers.saved'));
              } catch (caught) {
                toast.error(readableDbError(caught) ?? t('domain:contactNumbers.saveError'));
              }
            }}
            pending={save.isPending}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function NumberField({
  kind,
  current,
  canEdit,
  onSave,
  pending,
}: {
  kind: Kind;
  current: number | undefined;
  canEdit: boolean;
  onSave: (next: number) => Promise<void>;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState<string | null>(null);
  const shown = value ?? (current != null ? String(current) : '');
  const parsed = Number(shown);
  const valid = Number.isInteger(parsed) && parsed >= 1;
  const dirty = value !== null && valid && parsed !== current;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{t(`domain:contactNumbers.next.${kind}`)}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          inputMode="numeric"
          value={shown}
          disabled={!canEdit}
          onChange={(event) => setValue(event.target.value)}
          input={{ className: 'tabular-nums' }}
        />
        {canEdit ? (
          <Button
            disabled={!dirty || pending}
            onClick={() => void onSave(parsed).then(() => setValue(null))}
          >
            {t('common:action.save')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
