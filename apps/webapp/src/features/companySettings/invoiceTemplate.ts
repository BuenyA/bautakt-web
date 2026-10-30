import type { RenderBundle } from '@bautakt/document-render';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useMembership } from '@/features/company/useMembership';
import {
  type DraftBody,
  loadBundle,
  type LoadedBundle,
  renderInWorker,
} from '@/features/finance/clientRender';
import { resizeImageToJpeg } from '@/lib/imageResize';
import { supabase } from '@/lib/supabase';

/**
 * Akzentfarben der Rechnung — dieselbe Palette wie die App
 * (`bautakt-app/app/lib/finance/invoiceTemplate.ts`). Das sind Werte, die in
 * `companies.invoice_accent_color` gespeichert und ins PDF gedruckt werden,
 * keine Farben der Oberfläche: Weiß auf jedem davon erreicht mindestens 4,5:1
 * (Tabellenkopf, Summenzeile). Leer heißt „Standardfarbe des Renderers“.
 */
export const INVOICE_ACCENTS = [
  { value: '', key: 'default' },
  { value: '#0A66C2', key: 'blue' },
  { value: '#0369A1', key: 'teal' },
  { value: '#475569', key: 'slate' },
  { value: '#15803D', key: 'green' },
  { value: '#DC2626', key: 'red' },
] as const;

/** Normalform für die Datenbank: `#RRGGBB` in Großbuchstaben, sonst leer. */
export function normalizeAccent(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : '';
}

/** Wie die App: 512 px Kantenlänge, JPEG 0,8, Bucket `company-images`. */
const LOGO_BUCKET = 'company-images';
const LOGO_MAX_DIMENSION = 512;
const LOGO_QUALITY = 0.8;
const SIGNED_URL_SECONDS = 3600;

const isStoragePath = (value: string | null | undefined): value is string =>
  Boolean(value?.trim()) && !/^https?:\/\//.test(value!);

/** Anzeigbare URL des Logos (privater Bucket, signiert). */
export function useCompanyLogoUrl(path: string | null | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-logo-url', companyId, path],
    enabled: Boolean(companyId && path),
    staleTime: (SIGNED_URL_SECONDS - 300) * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      if (!isStoragePath(path)) return path;
      const { data, error } = await supabase.storage
        .from(LOGO_BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/**
 * Logo setzen oder entfernen. Erst hochladen, dann die Spalte umstellen,
 * dann die alte Datei löschen — schlägt das Löschen fehl, bleibt nur eine
 * verwaiste Datei, nie ein Betrieb ohne Logo.
 */
export function useCompanyLogo() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async ({ file, previous }: { file: File | null; previous: string | null }) => {
      let path: string | null = null;
      if (file) {
        const blob = await resizeImageToJpeg(file, LOGO_MAX_DIMENSION, LOGO_QUALITY);
        path = `${companyId}/logo/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from(LOGO_BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
      }
      const { error } = await supabase
        .from('companies')
        .update({ logo_image_url: path })
        .eq('id', companyId!);
      if (error) throw error;
      if (isStoragePath(previous) && previous !== path) {
        await supabase.storage.from(LOGO_BUCKET).remove([previous]);
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] }),
        queryClient.invalidateQueries({ queryKey: ['company-setup-status', companyId] }),
      ]),
  });
}

export type TemplateValues = {
  accent: string;
  intro: string;
  footer: string;
  paymentTermDays: number;
};

/**
 * Musterrechnung mit zwei Positionen. Ein Kunde fehlt bewusst — die Vorschau
 * zeigt die Vorlage, nicht einen echten Beleg; der Empfänger bleibt leer.
 */
function sampleDraft(companyId: string, values: TemplateValues, labels: SampleLabels): DraftBody {
  const today = new Date().toISOString().slice(0, 10);
  return {
    document: {
      company_id: companyId,
      type: 'invoice',
      customer_id: null,
      issue_date: today,
      service_date: today,
      tax_mode: 'standard',
      intro_text: values.intro,
      footer_text: values.footer,
      payment_term_days: values.paymentTermDays,
      net_total: 1000,
      vat_total: 190,
      gross_total: 1190,
      e_invoice: false,
    },
    lines: [
      {
        kind: 'labor',
        title: labels.labor,
        quantity: 8,
        unit: 'h',
        unit_price: 75,
        tax_rate_percent: 19,
        tax_category: 'standard',
        net_amount: 600,
      },
      {
        kind: 'material',
        title: labels.material,
        quantity: 1,
        unit: 'Psch',
        unit_price: 400,
        tax_rate_percent: 19,
        tax_category: 'standard',
        net_amount: 400,
      },
    ],
  };
}

export type SampleLabels = { labor: string; material: string };

/** Tipp-Pause bis zum nächsten Rendern, wie im Beleg-Editor. */
const PREVIEW_DELAY_MS = 600;

/**
 * Live-Vorschau der Vorlage: dasselbe Bündel und derselbe Render-Kern wie der
 * Beleg-Editor (#160), nur mit der Akzentfarbe aus dem Formular statt aus der
 * Datenbank. Das Logo kommt aus dem Bündel; nach einem neuen Logo
 * (`logoPath`) wird es neu geladen.
 */
export function useTemplatePreview(
  values: TemplateValues,
  logoPath: string | null,
  labels: SampleLabels,
) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [rendering, setRendering] = useState(false);
  const bundleRef = useRef<{ key: string; promise: Promise<LoadedBundle> } | null>(null);
  const runRef = useRef(0);
  const json = JSON.stringify(values);

  useEffect(() => {
    if (!companyId) return;
    const run = ++runRef.current;
    const timer = window.setTimeout(
      async () => {
        const draft = sampleDraft(companyId, JSON.parse(json) as TemplateValues, labels);
        const key = `${companyId}:${logoPath ?? ''}`;
        setRendering(true);
        try {
          if (bundleRef.current?.key !== key) {
            bundleRef.current = { key, promise: loadBundle(draft) };
          }
          const loaded = await bundleRef.current.promise;
          const accent = normalizeAccent((JSON.parse(json) as TemplateValues).accent);
          const bundle: RenderBundle = {
            ...loaded.bundle,
            company: loaded.bundle.company
              ? { ...loaded.bundle.company, invoice_accent_color: accent || null }
              : null,
          };
          const result = await renderInWorker(draft, { bundle, logo: loaded.logo });
          if (run !== runRef.current) return;
          setPdf(result.pdf);
          setError(null);
        } catch (cause) {
          bundleRef.current = null;
          if (run !== runRef.current) return;
          setError(cause);
        } finally {
          if (run === runRef.current) setRendering(false);
        }
      },
      pdf ? PREVIEW_DELAY_MS : 0,
    );
    return () => window.clearTimeout(timer);
    // `labels` ist pro Sprache fest; `pdf` steuert nur die erste Verzögerung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, json, logoPath]);

  return { pdf, error, rendering };
}
