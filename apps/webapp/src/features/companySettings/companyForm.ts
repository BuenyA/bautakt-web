import type { TablesUpdate } from '@bautakt/supabase';
import { toast } from '@bautakt/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';

/** Was der Unternehmensbereich an `companies` schreibt; nie Id oder Ersteller. */
export type CompanyPatch = Omit<TablesUpdate<'companies'>, 'id' | 'creator_id' | 'created_at'>;

/**
 * Eine Zeile von `companies` ändern. Schreiben dürfen laut RLS Inhaber und
 * wer `canEditCompanyMasterData` oder `canManageCompanySettings` hat; die
 * Seite blendet die Knöpfe nur aus.
 *
 * Den Verkäufer liest der Renderer beim Erzeugen des PDFs. Freigegebene
 * Belege ändern sich dadurch nicht: Ihr Original-PDF liegt schon im Archiv.
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (patch: CompanyPatch) => {
      const { error } = await supabase.from('companies').update(patch).eq('id', companyId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      // Steuer-IDs und Kleinunternehmer lesen Editor und Belegseite getrennt.
      await Promise.all(
        [
          'company-settings',
          'company-tax-ids',
          'company-tax-profile',
          'company-legal-missing',
          'company-legal-details',
          'company-setup-status',
        ].map((key) => queryClient.invalidateQueries({ queryKey: [key, companyId] })),
      );
      // Der Firmenname steht im Profilmenü und in der Firmenliste.
      await queryClient.invalidateQueries({ queryKey: ['membership'] });
      await queryClient.invalidateQueries({ queryKey: ['my-companies'] });
    },
  });
}

export const text = (value: string | null | undefined) => value ?? '';

/**
 * Ein Formular je Karte: Fehler am Feld, sobald es angefasst oder gespeichert
 * wurde; „Speichern“ erst, wenn sich etwas geändert hat.
 */
export function useCardForm<T extends Record<string, string | boolean>>(
  initial: T,
  errorsOf: (values: T) => Partial<Record<keyof T, string>>,
) {
  const [values, setValues] = useState<T | null>(null);
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const current = values ?? initial;
  const errors = errorsOf(current);
  const dirty = (Object.keys(initial) as (keyof T)[]).some((key) => current[key] !== initial[key]);

  return {
    values: current,
    dirty,
    hasErrors: Object.values(errors).some(Boolean),
    errorFor: (key: keyof T) => (submitted || touched.has(key) ? errors[key] : undefined),
    set: (patch: Partial<T>) => {
      setValues({ ...current, ...patch });
      setTouched((prev) => new Set([...prev, ...(Object.keys(patch) as (keyof T)[])]));
    },
    submit: () => setSubmitted(true),
    reset: () => {
      setValues(null);
      setTouched(new Set());
      setSubmitted(false);
    },
  };
}

/** Speichern mit Rückmeldung; `onDone` setzt das Formular auf den neuen Stand. */
export function useSave(update: ReturnType<typeof useUpdateCompany>, onDone: () => void) {
  const { t } = useTranslation();
  return async (patch: CompanyPatch) => {
    try {
      await update.mutateAsync(patch);
      toast.success(t('domain:settings.saved'));
      onDone();
    } catch (caught) {
      toast.error(t('domain:settings.saveError'), {
        description: readableDbError(caught) ?? undefined,
      });
    }
  };
}
