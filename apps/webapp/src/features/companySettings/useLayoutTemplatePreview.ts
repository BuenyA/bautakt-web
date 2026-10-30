import type { RenderBundle } from '@bautakt/document-render';
import { useEffect, useRef, useState } from 'react';

import {
  type DraftBody,
  loadBundle,
  type LoadedBundle,
  renderInWorker,
} from '@/features/finance/clientRender';

import { rowFromForm, type TemplateForm, type TemplateTextType } from './invoiceTemplates';

/** Belegarten, mit denen die Vorlage in der Vorschau gezeigt werden kann. */
export const PREVIEW_TYPES = [
  'partial_invoice',
  'final_invoice',
  'credit_note',
  'invoice',
] as const;
export type PreviewType = (typeof PREVIEW_TYPES)[number];

const SAMPLE_PARENT_ID = '00000000-0000-4000-8000-0000000000a1';
const SAMPLE_CREDITED = [
  {
    id: '00000000-0000-4000-8000-0000000000b1',
    document_number: '2026301',
    issue_date: '2026-07-15',
  },
  {
    id: '00000000-0000-4000-8000-0000000000b2',
    document_number: '2026344',
    issue_date: '2026-09-01',
  },
];

/** Beispielkunde der Vorschau; die echten Kunden bleiben unberührt. */
const SAMPLE_CUSTOMER: RenderBundle['customer'] = {
  contact: {
    kind: 'person',
    company_name: null,
    first_name: 'Sarah u. Sebastian',
    last_name: 'Fischer',
    email: null,
    street_address: 'Wobachstraße 48/1',
    postal_code: '74321',
    city: 'Bietigheim-Bissingen',
    country: 'DE',
    vat_id: null,
  },
  profile: {
    customer_number: null,
    is_construction_business: false,
    tax_exemption_valid_until: null,
    payment_term_days: null,
    billing_street: null,
    billing_postal_code: null,
    billing_city: null,
    billing_country: null,
  },
};

function line(sort: number, title: string, net: number, extra: Record<string, unknown> = {}) {
  return {
    sort_order: sort,
    kind: 'service',
    title,
    description: '',
    quantity: 1,
    unit: 'psch',
    unit_price: net,
    tax_rate_percent: 19,
    tax_category: 'standard',
    net_amount: net,
    ...extra,
  };
}

/** Beispielbeleg je Art, mit den Texten der Vorlage wie im Editor vorbelegt. */
function sampleDraft(companyId: string, type: PreviewType, form: TemplateForm): DraftBody {
  const texts = form.texts[type as TemplateTextType];
  const today = new Date().toISOString().slice(0, 10);
  const document: Record<string, unknown> = {
    company_id: companyId,
    type,
    issue_date: today,
    service_date: today,
    tax_mode: 'standard',
    payment_term_days: 14,
    subject: 'BV: NB EFH, Lerchenweg 13, 74321 Bietigheim',
    intro_text: texts.intro,
    footer_text: texts.footer,
  };
  let lines: Record<string, unknown>[];
  if (type === 'partial_invoice') {
    lines = [line(0, '1. Abschlagszahlung - Baustelleneinrichtung', 10504.2)];
  } else if (type === 'final_invoice') {
    lines = [
      line(0, 'Nettosumme lt. Aufstellung', 221178.37),
      line(1, 'abzgl. 2,5 % Abgebot', -5529.46),
      line(2, 'Abschlag 1', -100000, {
        kind: 'partial_credit',
        credited_document_id: SAMPLE_CREDITED[0].id,
      }),
      line(3, 'Abschlag 2', -109682.29, {
        kind: 'partial_credit',
        credited_document_id: SAMPLE_CREDITED[1].id,
      }),
    ];
  } else if (type === 'credit_note') {
    document.parent_document_id = SAMPLE_PARENT_ID;
    lines = [line(0, 'Gutschriftsnettosumme lt. Aufstellung', 13746.81)];
  } else {
    lines = [
      line(0, 'Erdarbeiten Baugrube', 4850, { quantity: 1 }),
      line(1, 'Mauerwerk KS 17,5 cm', 6240, { quantity: 104, unit: 'm²', unit_price: 60 }),
    ];
  }
  return { document, lines };
}

/**
 * Live-Vorschau einer Vorlage: Betrieb und Logo kommen einmal von der
 * Function (`bundle_only`), danach rendert der Web Worker jeden Formularstand
 * mit einem Beispielbeleg. Die Vorlage geht aus dem Formular ins Bündel —
 * Speichern ist für die Vorschau nicht nötig.
 */
export function useTemplatePreview({
  companyId,
  templateId,
  form,
  type,
}: {
  companyId: string | null | undefined;
  templateId: string;
  form: TemplateForm | null;
  type: PreviewType;
}) {
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const bundleRef = useRef<Promise<LoadedBundle> | null>(null);
  const runRef = useRef(0);
  const json = form ? JSON.stringify(form) : null;

  useEffect(() => {
    if (!companyId || !form) return;
    const run = ++runRef.current;
    const timer = window.setTimeout(
      () => {
        const draft = sampleDraft(companyId, type, form);
        bundleRef.current ??= loadBundle({ document: { company_id: companyId, type }, lines: [] });
        setLoading(true);
        bundleRef.current
          .then((loaded) =>
            renderInWorker(draft, {
              logo: loaded.logo,
              bundle: {
                ...loaded.bundle,
                customer: SAMPLE_CUSTOMER,
                parent: { document_number: '2026403', issue_date: '2026-09-25' },
                credited: SAMPLE_CREDITED,
                template: rowFromForm(templateId, form),
              },
            }),
          )
          .then((result) => {
            if (run !== runRef.current) return;
            setPdf(result.pdf);
            setError(null);
          })
          .catch((cause: unknown) => {
            if (run !== runRef.current) return;
            bundleRef.current = null;
            setError(cause);
          })
          .finally(() => {
            if (run === runRef.current) setLoading(false);
          });
      },
      pdf ? 500 : 0,
    );
    return () => window.clearTimeout(timer);
    // `form` steckt in `json`; ein neues Objekt mit gleichem Inhalt rendert nicht neu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, templateId, json, type]);

  return { pdf, loading, error };
}
