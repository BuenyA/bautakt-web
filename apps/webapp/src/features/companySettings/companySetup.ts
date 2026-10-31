import { useLegalFooterMissing } from '@/features/company/useLegalFooter';
import { routes } from '@/lib/routes';

import { useCompanyAccess } from './companyAccess';
import { type CompanyRecord, useCompanyRecord } from './useCompanyRecord';

export type SetupCheck = {
  key: 'address' | 'tax' | 'register' | 'bank' | 'logo';
  done: boolean;
  to: string;
  /** Freiwillig: zählt nicht zum Einrichtungsstand. */
  optional?: boolean;
};

const filled = (...values: (string | null | undefined)[]) =>
  values.every((value) => Boolean(value?.trim()));

/**
 * Was eine Rechnung und eine Mail aus Bautakt brauchen. Dieselben Regeln wie
 * beim Freigeben (`MISSING_SELLER_TAX_ID`) und beim Versand
 * (`company_legal_footer_missing`). Die Einrichtung sagt vorher, was dort
 * scheitern würde.
 */
function checksFor(company: CompanyRecord, legalMissing: readonly string[]): SetupCheck[] {
  return [
    {
      key: 'address',
      done: filled(
        company.name,
        company.street_address,
        company.postal_code,
        company.city,
        company.email,
        company.phone_number,
      ),
      to: routes.companyMasterData,
    },
    {
      key: 'tax',
      done: filled(company.tax_number) || filled(company.vat_id),
      to: routes.companyLegal,
    },
    { key: 'register', done: legalMissing.length === 0, to: routes.companyLegal },
    { key: 'bank', done: filled(company.iban, company.bank_name), to: routes.companyBank },
    {
      key: 'logo',
      done: filled(company.logo_image_url),
      to: routes.companyInvoiceTemplate,
      optional: true,
    },
  ];
}

/**
 * Einrichtungsstand des Betriebs. Der Abschnitt „Einrichtung“ gibt es nur,
 * solange `pending` gilt: Sind alle Pflichtpunkte erledigt, verschwindet er
 * (Owner, 2026-10-30). Wer die Stammdaten nicht sehen darf, bekommt ihn nie.
 */
export function useCompanySetup() {
  const access = useCompanyAccess();
  const company = useCompanyRecord();
  const legal = useLegalFooterMissing();
  const relevant = access.masterData.view;

  const checks = relevant && company.data ? checksFor(company.data, legal.data ?? []) : [];
  const required = checks.filter((check) => !check.optional);
  const done = required.filter((check) => check.done).length;
  const isLoading = relevant && (company.isLoading || legal.isLoading);
  const complete = required.length > 0 && done === required.length;

  return {
    checks,
    done,
    total: required.length,
    isLoading,
    pending: relevant && !isLoading && required.length > 0 && !complete,
  };
}
