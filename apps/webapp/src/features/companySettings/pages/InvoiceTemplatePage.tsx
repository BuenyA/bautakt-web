import { SkeletonBlock, toast } from '@bautakt/ui';
import {
  Button,
  ColorSwatch,
  Field,
  Image,
  makeStyles,
  Spinner,
  SwatchPicker,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { ArrowUpload20Regular, Delete20Regular, Image20Regular } from '@fluentui/react-icons';
import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { SectionCard } from '@/features/contacts/SectionCard';
import { PdfViewer } from '@/features/finance/PdfViewer';
import { readableDbError } from '@/lib/dbErrors';
import { ImageResizeError } from '@/lib/imageResize';

import { useCompanyAccess } from '../companyAccess';
import { useCardForm, useSave, useUpdateCompany } from '../companyForm';
import { FormCard } from '../FormCard';
import {
  INVOICE_ACCENTS,
  normalizeAccent,
  useCompanyLogo,
  useCompanyLogoUrl,
  useTemplatePreview,
} from '../invoiceTemplate';
import { InvoiceTemplatesCard } from '../InvoiceTemplatesCard';
import { SectionGuard } from '../SectionGuard';
import { type CompanyRecord, useCompanyRecord } from '../useCompanyRecord';

const useStyles = makeStyles({
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '160px',
    height: '96px',
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    // Das Logo steht auf der Rechnung immer auf Weiß.
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
    color: tokens.colorNeutralForeground3,
  },
  // Standardfarbe: Fluents neutrale Fläche statt eines eigenen Werts.
  defaultSwatch: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  preview: {
    height: '760px',
    minHeight: 0,
  },
});

function LogoCard({ company, canEdit }: { company: CompanyRecord; canEdit: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const input = useRef<HTMLInputElement>(null);
  const logo = useCompanyLogo();
  const url = useCompanyLogoUrl(company.logo_image_url);

  async function change(file: File | null) {
    try {
      await logo.mutateAsync({ file, previous: company.logo_image_url });
      toast.success(
        t(file ? 'companySettings:template.logoSaved' : 'companySettings:template.logoRemoved'),
      );
    } catch (caught) {
      const description =
        caught instanceof ImageResizeError
          ? t(`companySettings:template.logoErrors.${caught.code}`)
          : (readableDbError(caught) ?? undefined);
      toast.error(t('companySettings:template.logoError'), { description });
    }
  }

  return (
    <SectionCard
      title={t('companySettings:template.logo')}
      description={t('companySettings:template.logoHint')}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className={styles.logoBox}>
          {logo.isPending ? (
            <Spinner size="small" />
          ) : url.data ? (
            <Image src={url.data} alt={t('companySettings:template.logo')} fit="contain" />
          ) : (
            <Image20Regular aria-label={t('companySettings:template.noLogo')} />
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = '';
                if (file) void change(file);
              }}
            />
            <Button
              icon={<ArrowUpload20Regular />}
              disabled={logo.isPending}
              onClick={() => input.current?.click()}
            >
              {t(
                company.logo_image_url
                  ? 'companySettings:template.replaceLogo'
                  : 'companySettings:template.uploadLogo',
              )}
            </Button>
            {company.logo_image_url ? (
              <Button
                appearance="subtle"
                icon={<Delete20Regular />}
                disabled={logo.isPending}
                onClick={() => void change(null)}
              >
                {t('companySettings:template.removeLogo')}
              </Button>
            ) : null}
          </div>
        ) : (
          <Text className="text-muted-foreground">
            {t('companySettings:template.logoReadOnly')}
          </Text>
        )}
      </div>
    </SectionCard>
  );
}

function TemplateEditor({
  company,
  canEdit,
  logoCard,
}: {
  company: CompanyRecord;
  canEdit: boolean;
  logoCard: ReactNode;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const update = useUpdateCompany();
  const form = useCardForm(
    {
      accent: normalizeAccent(company.invoice_accent_color),
      intro: company.invoice_intro_text ?? '',
      footer: company.invoice_footer_text ?? '',
    },
    () => ({}),
  );
  const save = useSave(update, form.reset);
  const v = form.values;
  const preview = useTemplatePreview(
    {
      accent: v.accent,
      intro: v.intro,
      footer: v.footer,
      paymentTermDays: company.payment_term_days,
    },
    company.logo_image_url,
    {
      labor: t('companySettings:template.sampleLabor'),
      material: t('companySettings:template.sampleMaterial'),
    },
  );

  return (
    // Gestapelt so breit wie die anderen Abschnitte; ab 2xl die Vorschau daneben.
    <div className="grid max-w-3xl items-start gap-4 2xl:max-w-none 2xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        {logoCard}
        <FormCard
          title={t('companySettings:template.design')}
          description={t('companySettings:template.designHint')}
          canEdit={canEdit}
          dirty={form.dirty}
          saving={update.isPending}
          onReset={form.reset}
          onSave={() =>
            void save({
              invoice_accent_color: normalizeAccent(v.accent),
              invoice_intro_text: v.intro.trim(),
              invoice_footer_text: v.footer.trim(),
            })
          }
        >
          <Field label={t('companySettings:template.accent')}>
            <SwatchPicker
              aria-label={t('companySettings:template.accent')}
              selectedValue={v.accent || 'default'}
              onSelectionChange={(_, data) =>
                canEdit &&
                form.set({ accent: data.selectedValue === 'default' ? '' : data.selectedValue })
              }
              size="large"
              shape="rounded"
            >
              {INVOICE_ACCENTS.map((accent) =>
                accent.value ? (
                  <ColorSwatch
                    key={accent.key}
                    value={accent.value}
                    color={accent.value}
                    disabled={!canEdit}
                    aria-label={t(`companySettings:template.accents.${accent.key}`)}
                  />
                ) : (
                  <ColorSwatch
                    key={accent.key}
                    value="default"
                    color="transparent"
                    className={styles.defaultSwatch}
                    disabled={!canEdit}
                    aria-label={t('companySettings:template.accents.default')}
                  />
                ),
              )}
            </SwatchPicker>
          </Field>
          <Text className="text-muted-foreground -mt-2">
            {t(
              `companySettings:template.accents.${
                INVOICE_ACCENTS.find((accent) => accent.value === v.accent)?.key ?? 'default'
              }`,
            )}
          </Text>
          <Field
            label={t('companySettings:template.intro')}
            hint={t('companySettings:template.introHint')}
          >
            <Textarea
              value={v.intro}
              disabled={!canEdit}
              resize="vertical"
              rows={3}
              maxLength={1000}
              placeholder={t('companySettings:template.introPlaceholder')}
              onChange={(_, d) => form.set({ intro: d.value })}
            />
          </Field>
          <Field
            label={t('companySettings:template.footer')}
            hint={t('companySettings:template.footerHint')}
          >
            <Textarea
              value={v.footer}
              disabled={!canEdit}
              resize="vertical"
              rows={3}
              maxLength={1000}
              placeholder={t('companySettings:template.footerPlaceholder')}
              onChange={(_, d) => form.set({ footer: d.value })}
            />
          </Field>
        </FormCard>
      </div>

      <SectionCard
        title={t('companySettings:template.preview')}
        description={t('companySettings:template.previewHint')}
      >
        <div className={styles.preview}>
          <PdfViewer
            data={preview.pdf}
            loading={preview.rendering}
            error={preview.error ? t('companySettings:template.previewError') : null}
            emptyText={t('companySettings:template.previewEmpty')}
          />
        </div>
      </SectionCard>
    </div>
  );
}

/**
 * Rechnungsvorlage: Logo, Akzentfarbe, Einleitung und Schlusstext. Farbe
 * und Texte gelten für neue Belege; freigegebene Belege bleiben, wie sie
 * archiviert sind. Rechts eine Musterrechnung aus demselben Render-Kern wie
 * der Beleg-Editor.
 */
export function InvoiceTemplatePage() {
  const { t } = useTranslation();
  const access = useCompanyAccess();
  const { data, isLoading } = useCompanyRecord();

  return (
    <SectionGuard allowed={access.invoicing.view}>
      <SubPage
        title={t('companySettings:template.title')}
        description={t('companySettings:template.description')}
        wide
      >
        {/* Eigene Layouts wie der Briefbogen; ohne Vorlage gilt das Standard-Layout darunter. */}
        <div className="max-w-3xl">
          <InvoiceTemplatesCard />
        </div>
        {isLoading || !data ? (
          <SkeletonBlock className="h-96 w-full" />
        ) : (
          <TemplateEditor
            key={JSON.stringify([
              data.invoice_accent_color,
              data.invoice_intro_text,
              data.invoice_footer_text,
            ])}
            company={data}
            canEdit={access.invoicing.edit}
            logoCard={
              <LogoCard
                key={data.logo_image_url ?? ''}
                company={data}
                canEdit={access.invoicing.editLogo}
              />
            }
          />
        )}
      </SubPage>
    </SectionGuard>
  );
}
