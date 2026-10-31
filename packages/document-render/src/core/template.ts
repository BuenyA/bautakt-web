/**
 * Rechnungsvorlagen (`invoice_templates`) → Layout-Angaben für den Renderer.
 *
 * Eine Vorlage ist ein Grundlayout plus Einstellungen (jsonb). Das Layout
 * `standard` ist das bisherige PDF und braucht hier nichts. `letterhead` ist
 * der Briefbogen (Vorbild: Spahr-Bau): großes Logo rechts mit
 * Leistungsaufzählung, Farbstreifen am linken Rand, Slogan und Bankspalten im
 * Fuß, Summen mit Unterstreichung statt Farbband.
 *
 * Alles hier ist defensiv: unbekannte Schlüssel fallen weg, kaputte Werte
 * werden ignoriert oder auf den Standard gesetzt, mit Warnung. Eine falsch
 * gepflegte Vorlage darf keinen Beleg verhindern — genau wie die
 * Akzentfarbe (`buildAccentPalette` in pdf.ts).
 *
 * Gemeinsamer Kern (bautakt-web#160): Datei wird nach bautakt-web gespiegelt.
 */

/** Zeile aus `invoice_templates`, so weit der Renderer sie liest. */
export type InvoiceTemplateRow = {
  id: string;
  name: string | null;
  layout: string | null;
  settings: unknown;
};

export type TemplateBankAccount = { bankName: string; iban: string; bic: string };

/** Belegtexte einer Vorlage je Belegart (Vorbelegung im Editor). */
export type TemplateTexts = { title: string; intro: string; footer: string };

/**
 * Aufgelöster Briefbogen. Steht nur in `InvoiceData`, wenn die Vorlage das
 * Layout `letterhead` hat — sonst fehlt das Feld ganz, damit Fingerabdruck
 * und PDF der Standardbelege unverändert bleiben.
 */
export type LetterheadLayout = {
  kind: "letterhead";
  /** Belegtitel dieser Belegart laut Vorlage („Abschlagsrechnung“); leer = Standardtitel. */
  documentTitle: string;
  /** `#RRGGBB`: Slogan, Leistungsaufzählung, rechter Seitenstreifen. */
  primaryColor: string;
  /** `#RRGGBB`: Aufzählungspunkte, linker Seitenstreifen. */
  secondaryColor: string;
  /** Leistungsaufzählung unter dem Logo, z. B. „Hoch- u. Tiefbau“. */
  services: string[];
  /** Slogan über der Fußzeile. */
  slogan: string;
  /** Zwei Farbstreifen am linken Rand. */
  sideStripes: boolean;
  /** Zeichen/Bearbeiterkürzel hinter dem Datum, z. B. „ak-sz“. */
  reference: string;
  fax: string;
  website: string;
  /** Weitere Bankverbindungen neben der des Betriebs. */
  extraBankAccounts: TemplateBankAccount[];
  /** Rechtsangaben-Zeile; leer = aus den Firmendaten zusammengesetzt. */
  legalLine: string;
  /** Grußformel, z. B. „Mit freundlichen Grüßen“; leer = keine. */
  closingGreeting: string;
  /** Zeilen unter der Grußformel, z. B. „SPAHR - BAU GMBH“, „SACHSENHEIM“. */
  signatureLines: string[];
};

export type TemplateLayoutKey = "standard" | "letterhead";

/** Belegarten mit eigenen Vorlagentexten. */
export const TEMPLATE_TEXT_TYPES = [
  "invoice",
  "partial_invoice",
  "final_invoice",
  "credit_note",
  "cancellation",
  "quote",
  "order_confirmation",
  "delivery_note",
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_TEXT = 2000;
const MAX_LIST = 12;

export const LETTERHEAD_DEFAULTS: Omit<LetterheadLayout, "kind" | "documentTitle"> = {
  primaryColor: "#F26522",
  secondaryColor: "#22408F",
  services: [],
  slogan: "",
  sideStripes: true,
  reference: "",
  fax: "",
  website: "",
  extraBankAccounts: [],
  legalLine: "",
  closingGreeting: "",
  signatureLines: [],
};

function str(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function strList(value: unknown, max = 120): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => str(item, max)).filter(Boolean).slice(0, MAX_LIST);
}

function color(value: unknown, fallback: string, label: string, warnings: string[]): string {
  const raw = str(value, 20);
  if (!raw) return fallback;
  if (HEX.test(raw)) return raw.toUpperCase();
  warnings.push(
    `Vorlage: ${label} "${raw}" ist kein gültiger Farbwert im Format #RRGGBB — Standardfarbe verwendet.`,
  );
  return fallback;
}

function settingsObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function templateLayoutKey(row: InvoiceTemplateRow | null | undefined): TemplateLayoutKey {
  return row?.layout === "letterhead" ? "letterhead" : "standard";
}

/**
 * Vorlage → Briefbogen. `null`, wenn keine Vorlage oder Layout `standard`.
 */
export function resolveLetterhead(
  row: InvoiceTemplateRow | null | undefined,
  documentType: string,
  warnings: string[],
): LetterheadLayout | null {
  if (!row || templateLayoutKey(row) !== "letterhead") return null;
  const s = settingsObject(row.settings);
  const banks = Array.isArray(s.extraBankAccounts) ? s.extraBankAccounts : [];
  return {
    kind: "letterhead",
    documentTitle: templateTextsFor(row, documentType).title,
    primaryColor: color(s.primaryColor, LETTERHEAD_DEFAULTS.primaryColor, "Hauptfarbe", warnings),
    secondaryColor: color(
      s.secondaryColor,
      LETTERHEAD_DEFAULTS.secondaryColor,
      "Zweitfarbe",
      warnings,
    ),
    services: strList(s.services),
    slogan: str(s.slogan, 200),
    sideStripes: s.sideStripes !== false,
    reference: str(s.reference, 40),
    fax: str(s.fax, 60),
    website: str(s.website, 120),
    extraBankAccounts: banks
      .map((entry) => {
        const b = settingsObject(entry);
        return { bankName: str(b.bankName, 80), iban: str(b.iban, 42), bic: str(b.bic, 11) };
      })
      .filter((b) => b.iban)
      .slice(0, 3),
    legalLine: str(s.legalLine, 300),
    closingGreeting: str(s.closingGreeting, 120),
    signatureLines: strList(s.signatureLines),
  };
}

/**
 * Vorlagentexte für eine Belegart (`settings.texts[type]`), leer wenn keine.
 * Einleitung und Schlusstext belegt der Editor vor (sie landen dann am Beleg
 * in `intro_text`/`footer_text`); den Titel liest nur der Briefbogen.
 */
export function templateTextsFor(
  row: InvoiceTemplateRow | null | undefined,
  documentType: string,
): TemplateTexts {
  const texts = settingsObject(settingsObject(row?.settings).texts);
  const entry = settingsObject(texts[documentType]);
  return { title: str(entry.title, 80), intro: str(entry.intro), footer: str(entry.footer) };
}
