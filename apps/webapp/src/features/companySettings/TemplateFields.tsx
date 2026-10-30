import { TEMPLATE_TEXT_TYPES } from '@bautakt/document-render';
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Switch,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular } from '@fluentui/react-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HEX_COLOR, type TemplateForm, type TemplateTextType } from './invoiceTemplates';

/**
 * Felder einer eigenen Vorlage: Gestaltung, Brief, Fußzeile (nur Briefbogen)
 * und die Texte je Belegart. Name und Vorauswahl stehen auf der Seite selbst.
 */
export function TemplateFields({
  form,
  set,
}: {
  form: TemplateForm;
  set: (patch: Partial<TemplateForm>) => void;
}) {
  const { t } = useTranslation();
  const [textType, setTextType] = useState<TemplateTextType>('partial_invoice');
  const letterhead = form.layout === 'letterhead';
  const textEntry = form.texts[textType];
  const setText = (patch: Partial<typeof textEntry>) =>
    set({ texts: { ...form.texts, [textType]: { ...textEntry, ...patch } } });

  return (
    <>
      {letterhead ? (
        <>
          <Section title={t('domain:templates.sections.design')}>
            <div className="grid gap-4 md:grid-cols-2">
              <ColorField
                label={t('domain:templates.fields.primaryColor')}
                hint={t('domain:templates.fields.primaryColorHint')}
                value={form.primaryColor}
                onChange={(value) => set({ primaryColor: value })}
              />
              <ColorField
                label={t('domain:templates.fields.secondaryColor')}
                hint={t('domain:templates.fields.secondaryColorHint')}
                value={form.secondaryColor}
                onChange={(value) => set({ secondaryColor: value })}
              />
            </div>
            <Switch
              checked={form.sideStripes}
              label={t('domain:templates.fields.sideStripes')}
              onChange={(_, d) => set({ sideStripes: d.checked })}
            />
            <Field
              label={t('domain:templates.fields.services')}
              hint={t('domain:templates.fields.servicesHint')}
            >
              <Textarea
                rows={3}
                value={form.services}
                onChange={(_, d) => set({ services: d.value })}
              />
            </Field>
            <Field label={t('domain:templates.fields.slogan')}>
              <Input value={form.slogan} onChange={(_, d) => set({ slogan: d.value })} />
            </Field>
            <Text size={200} className="text-muted-foreground">
              {t('domain:templates.logoHint')}
            </Text>
          </Section>

          <Section title={t('domain:templates.sections.letter')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t('domain:templates.fields.reference')}
                hint={t('domain:templates.fields.referenceHint')}
              >
                <Input value={form.reference} onChange={(_, d) => set({ reference: d.value })} />
              </Field>
              <Field label={t('domain:templates.fields.closingGreeting')}>
                <Input
                  value={form.closingGreeting}
                  onChange={(_, d) => set({ closingGreeting: d.value })}
                />
              </Field>
            </div>
            <Field
              label={t('domain:templates.fields.signatureLines')}
              hint={t('domain:templates.fields.linesHint')}
            >
              <Textarea
                rows={2}
                value={form.signatureLines}
                onChange={(_, d) => set({ signatureLines: d.value })}
              />
            </Field>
          </Section>

          <Section title={t('domain:templates.sections.footer')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('domain:templates.fields.fax')}>
                <Input value={form.fax} onChange={(_, d) => set({ fax: d.value })} />
              </Field>
              <Field label={t('domain:templates.fields.website')}>
                <Input value={form.website} onChange={(_, d) => set({ website: d.value })} />
              </Field>
            </div>
            <Field
              label={t('domain:templates.fields.legalLine')}
              hint={t('domain:templates.fields.legalLineHint')}
            >
              <Input value={form.legalLine} onChange={(_, d) => set({ legalLine: d.value })} />
            </Field>
            <div className="flex flex-col gap-2">
              <Text weight="semibold">{t('domain:templates.fields.extraBanks')}</Text>
              <Text size={200} className="text-muted-foreground">
                {t('domain:templates.fields.extraBanksHint')}
              </Text>
              {form.extraBankAccounts.map((bank, index) => {
                const change = (patch: Partial<typeof bank>) =>
                  set({
                    extraBankAccounts: form.extraBankAccounts.map((b, i) =>
                      i === index ? { ...b, ...patch } : b,
                    ),
                  });
                return (
                  <div
                    key={index}
                    className="grid items-end gap-2 md:grid-cols-[1fr_1.4fr_1fr_auto]"
                  >
                    <Field label={t('domain:templates.fields.bankName')}>
                      <Input
                        value={bank.bankName}
                        onChange={(_, d) => change({ bankName: d.value })}
                      />
                    </Field>
                    <Field label="IBAN">
                      <Input value={bank.iban} onChange={(_, d) => change({ iban: d.value })} />
                    </Field>
                    <Field label="BIC">
                      <Input value={bank.bic} onChange={(_, d) => change({ bic: d.value })} />
                    </Field>
                    <Button
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      aria-label={t('common:action.delete')}
                      onClick={() =>
                        set({
                          extraBankAccounts: form.extraBankAccounts.filter((_, i) => i !== index),
                        })
                      }
                    />
                  </div>
                );
              })}
              {form.extraBankAccounts.length < 3 ? (
                <div>
                  <Button
                    size="small"
                    icon={<AddRegular />}
                    onClick={() =>
                      set({
                        extraBankAccounts: [
                          ...form.extraBankAccounts,
                          { bankName: '', iban: '', bic: '' },
                        ],
                      })
                    }
                  >
                    {t('domain:templates.fields.addBank')}
                  </Button>
                </div>
              ) : null}
            </div>
          </Section>
        </>
      ) : null}

      <Section title={t('domain:templates.sections.texts')}>
        <Text size={200} className="text-muted-foreground">
          {t('domain:templates.textsHint')}
        </Text>
        <Field label={t('domain:templates.fields.documentType')}>
          <Select value={textType} onChange={(_, d) => setTextType(d.value as TemplateTextType)}>
            {TEMPLATE_TEXT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`domain:templates.documentTypes.${type}`)}
              </option>
            ))}
          </Select>
        </Field>
        {letterhead ? (
          <Field
            label={t('domain:templates.fields.title')}
            hint={t('domain:templates.fields.titleHint')}
          >
            <Input value={textEntry.title} onChange={(_, d) => setText({ title: d.value })} />
          </Field>
        ) : null}
        <Field label={t('domain:templates.fields.intro')}>
          <Textarea
            rows={3}
            value={textEntry.intro}
            onChange={(_, d) => setText({ intro: d.value })}
          />
        </Field>
        <Field label={t('domain:templates.fields.footer')}>
          <Textarea
            rows={3}
            value={textEntry.footer}
            onChange={(_, d) => setText({ footer: d.value })}
          />
        </Field>
      </Section>
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="large">
      <Text as="h2" size={400} weight="semibold">
        {title}
      </Text>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const valid = HEX_COLOR.test(value);
  return (
    <Field
      label={label}
      hint={hint}
      validationMessage={valid ? undefined : t('domain:templates.colorInvalid')}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          value={valid ? value : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input className="min-w-0 flex-1" value={value} onChange={(_, d) => onChange(d.value)} />
      </div>
    </Field>
  );
}
