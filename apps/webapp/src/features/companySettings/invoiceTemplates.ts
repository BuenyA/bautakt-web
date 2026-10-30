import {
  type InvoiceTemplateRow,
  LETTERHEAD_DEFAULTS,
  TEMPLATE_TEXT_TYPES,
  type TemplateLayoutKey,
} from '@bautakt/document-render';
import type { Json, Tables } from '@bautakt/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/**
 * Rechnungsvorlagen (`invoice_templates`). Eine Vorlage ist ein Grundlayout
 * des Renderers (`standard` oder `letterhead`) plus Einstellungen als jsonb;
 * welche Schlüssel es gibt, bestimmt `finance-document-render/template.ts`.
 * Hier steht nur die Abbildung zwischen jsonb und Formular.
 */

export type InvoiceTemplate = Pick<
  Tables<'invoice_templates'>,
  'id' | 'name' | 'layout' | 'settings' | 'is_default' | 'archived_at' | 'modified_at'
>;

export type TemplateTextType = (typeof TEMPLATE_TEXT_TYPES)[number];

export type TemplateTexts = Record<
  TemplateTextType,
  { title: string; intro: string; footer: string }
>;

export type TemplateBank = { bankName: string; iban: string; bic: string };

/** Formularstand einer Vorlage. Listen als Text, eine Zeile je Eintrag. */
export type TemplateForm = {
  name: string;
  layout: TemplateLayoutKey;
  primaryColor: string;
  secondaryColor: string;
  services: string;
  slogan: string;
  sideStripes: boolean;
  reference: string;
  fax: string;
  website: string;
  extraBankAccounts: TemplateBank[];
  legalLine: string;
  closingGreeting: string;
  signatureLines: string;
  texts: TemplateTexts;
};

const emptyTexts = (): TemplateTexts =>
  Object.fromEntries(
    TEMPLATE_TEXT_TYPES.map((type) => [type, { title: '', intro: '', footer: '' }]),
  ) as TemplateTexts;

export function emptyTemplateForm(layout: TemplateLayoutKey = 'standard'): TemplateForm {
  return {
    name: '',
    layout,
    primaryColor: LETTERHEAD_DEFAULTS.primaryColor,
    secondaryColor: LETTERHEAD_DEFAULTS.secondaryColor,
    services: '',
    slogan: '',
    sideStripes: true,
    reference: '',
    fax: '',
    website: '',
    extraBankAccounts: [],
    legalLine: '',
    closingGreeting: '',
    signatureLines: '',
    texts: emptyTexts(),
  };
}

/**
 * Vorbelegung „Spahrbau“: der Briefbogen der Beispielrechnungen von Spahr-Bau
 * (Abschlags-, Schlussrechnung, Gutschrift). Anschrift, Telefon, E-Mail,
 * Hauptbank, Steuernummer und Register kommen wie immer aus den
 * Firmendaten; hier steht nur, was der Briefbogen zusätzlich zeigt.
 */
export function spahrbauPreset(): TemplateForm {
  const texts = emptyTexts();
  texts.partial_invoice = {
    title: 'Abschlagszahlung',
    intro:
      'Sehr geehrte Damen und Herren,\n\nentsprechend dem Baufortschritt bitten wir Sie um eine Abschlagszahlung in Höhe von',
    footer:
      'Leistungszeitpunkt entspricht dem Datum der Rechnungsstellung.\nVeranlassen Sie bitte, dass uns der Betrag zur Verfügung gestellt wird.',
  };
  texts.final_invoice = {
    title: 'Schlussrechnung',
    intro: '',
    footer: 'Wir bitten um Prüfung und fristgerechte Anweisung auf eines unserer Konten.',
  };
  texts.invoice = {
    title: 'Rechnung',
    intro: '',
    footer: 'Wir bitten um Prüfung und fristgerechte Anweisung auf eines unserer Konten.',
  };
  texts.credit_note = {
    title: 'Gutschrift',
    intro: '',
    footer: 'Der Leistungszeitpunkt entspricht dem Datum der Rechnungsstellung.',
  };
  return {
    ...emptyTemplateForm('letterhead'),
    name: 'Spahrbau',
    primaryColor: '#EF7B2D',
    secondaryColor: '#22408F',
    services: 'Hoch- u. Tiefbau\nIndustrie- und Wohnungsbau\nRenovierungen',
    slogan: 'Seit über 45 Jahren bekannt für Zuverlässigkeit + Erfahrung am Bau!',
    sideStripes: true,
    fax: '07147 / 2750-22',
    website: 'www.spahr-bau.de',
    extraBankAccounts: [
      { bankName: 'VR-Bank Ludwigsburg', iban: 'DE14 6049 1430 0160 4040 10', bic: 'GENODES1VBB' },
    ],
    closingGreeting: 'Mit freundlichen Grüßen',
    signatureLines: 'S P A H R - B A U   G M B H\nSACHSENHEIM',
    texts,
  };
}

export type TemplatePreset = 'standard' | 'letterhead' | 'spahrbau';

export function presetForm(preset: TemplatePreset): TemplateForm {
  if (preset === 'spahrbau') return spahrbauPreset();
  return emptyTemplateForm(preset);
}

// ---------------------------------------------------------------------------
// jsonb <-> Formular
// ---------------------------------------------------------------------------

const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const list = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export function formFromTemplate(row: Pick<InvoiceTemplate, 'name' | 'layout' | 'settings'>) {
  const s = record(row.settings);
  const base = emptyTemplateForm(row.layout === 'letterhead' ? 'letterhead' : 'standard');
  const rawTexts = record(s.texts);
  const texts = emptyTexts();
  for (const type of TEMPLATE_TEXT_TYPES) {
    const entry = record(rawTexts[type]);
    texts[type] = { title: str(entry.title), intro: str(entry.intro), footer: str(entry.footer) };
  }
  return {
    ...base,
    name: row.name,
    primaryColor: str(s.primaryColor) || base.primaryColor,
    secondaryColor: str(s.secondaryColor) || base.secondaryColor,
    services: list(s.services).join('\n'),
    slogan: str(s.slogan),
    sideStripes: s.sideStripes !== false,
    reference: str(s.reference),
    fax: str(s.fax),
    website: str(s.website),
    extraBankAccounts: (Array.isArray(s.extraBankAccounts) ? s.extraBankAccounts : []).map(
      (entry) => {
        const b = record(entry);
        return { bankName: str(b.bankName), iban: str(b.iban), bic: str(b.bic) };
      },
    ),
    legalLine: str(s.legalLine),
    closingGreeting: str(s.closingGreeting),
    signatureLines: list(s.signatureLines).join('\n'),
    texts,
  } satisfies TemplateForm;
}

export function settingsFromForm(form: TemplateForm): Json {
  const texts: Record<string, { title?: string; intro?: string; footer?: string }> = {};
  for (const type of TEMPLATE_TEXT_TYPES) {
    const entry = form.texts[type];
    const cleaned = {
      ...(entry.title.trim() ? { title: entry.title.trim() } : {}),
      ...(entry.intro.trim() ? { intro: entry.intro.trim() } : {}),
      ...(entry.footer.trim() ? { footer: entry.footer.trim() } : {}),
    };
    if (Object.keys(cleaned).length > 0) texts[type] = cleaned;
  }
  return {
    primaryColor: form.primaryColor.trim(),
    secondaryColor: form.secondaryColor.trim(),
    services: lines(form.services),
    slogan: form.slogan.trim(),
    sideStripes: form.sideStripes,
    reference: form.reference.trim(),
    fax: form.fax.trim(),
    website: form.website.trim(),
    extraBankAccounts: form.extraBankAccounts
      .map((b) => ({ bankName: b.bankName.trim(), iban: b.iban.trim(), bic: b.bic.trim() }))
      .filter((b) => b.iban),
    legalLine: form.legalLine.trim(),
    closingGreeting: form.closingGreeting.trim(),
    signatureLines: lines(form.signatureLines),
    texts,
  };
}

/** Formular als Zeile, wie der Renderer sie aus dem Bündel liest (Live-Vorschau). */
export function rowFromForm(id: string, form: TemplateForm): InvoiceTemplateRow {
  return { id, name: form.name, layout: form.layout, settings: settingsFromForm(form) };
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// ---------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------

/** Alle Vorlagen des Betriebs, Standard zuerst, archivierte zuletzt. */
export function useInvoiceTemplates() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['invoice-templates', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<InvoiceTemplate[]> => {
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('id, name, layout, settings, is_default, archived_at, modified_at')
        .eq('company_id', companyId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return [...(data ?? [])].sort(
        (a, b) =>
          Number(Boolean(a.archived_at)) - Number(Boolean(b.archived_at)) ||
          Number(b.is_default) - Number(a.is_default),
      );
    },
  });
}

export function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  return () =>
    queryClient.invalidateQueries({ queryKey: ['invoice-templates', membership?.companyId] });
}

export function useCreateTemplate() {
  const { data: membership } = useMembership();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: async ({ form, makeDefault }: { form: TemplateForm; makeDefault: boolean }) => {
      const companyId = membership!.companyId!;
      const { data, error } = await supabase
        .from('invoice_templates')
        .insert({
          company_id: companyId,
          name: form.name.trim(),
          layout: form.layout,
          settings: settingsFromForm(form),
        })
        .select('id')
        .single();
      if (error) throw error;
      if (makeDefault) {
        const { error: defaultError } = await supabase.rpc('set_default_invoice_template', {
          p_company_id: companyId,
          p_template_id: data.id,
        });
        if (defaultError) throw defaultError;
      }
      return data.id;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: TemplateForm }) => {
      const { data, error } = await supabase
        .from('invoice_templates')
        .update({ name: form.name.trim(), layout: form.layout, settings: settingsFromForm(form) })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      // RLS lässt ein Update ohne Recht still ins Leere laufen.
      if (data?.length !== 1) throw new Error('NOTHING_WRITTEN');
    },
    onSuccess: () => invalidate(),
  });
}

export function useSetDefaultTemplate() {
  const { data: membership } = useMembership();
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: async (templateId: string | null) => {
      const { error } = await supabase.rpc('set_default_invoice_template', {
        p_company_id: membership!.companyId!,
        p_template_id: templateId as string,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/** Archivieren statt löschen: festgeschriebene Belege verweisen auf die Vorlage. */
export function useArchiveTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('invoice_templates')
        .update(
          archived
            ? { archived_at: new Date().toISOString(), is_default: false }
            : { archived_at: null },
        )
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}
