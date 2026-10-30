import { toast } from '@bautakt/ui';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Field,
  Link,
  Radio,
  RadioGroup,
  Spinner,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { Mail20Regular, Send20Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SubPage } from '@/components/layout/SubNavLayout';
import { SectionCard } from '@/features/contacts/SectionCard';
import { readableDbError } from '@/lib/dbErrors';
import { SUPPORT_EMAIL } from '@/lib/support';

import { FEEDBACK_CATEGORIES, type FeedbackCategory, useSubmitFeedback } from '../useProfile';

const FAQ = ['switchCompany', 'invite', 'password', 'invoiceLogo', 'roles'] as const;

/** Mindestlänge, damit „ok“ nicht als Feedback ankommt. */
const MIN_MESSAGE = 10;

function FeedbackCard() {
  const { t } = useTranslation();
  const submit = useSubmitFeedback();
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const tooShort = message.trim().length < MIN_MESSAGE;

  return (
    <SectionCard title={t('account:help.feedback')} description={t('account:help.feedbackHint')}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (tooShort) return;
          submit.mutate(
            { category, message },
            {
              onSuccess: () => {
                toast.success(t('account:help.feedbackSent'));
                setMessage('');
                setSubmitted(false);
              },
              onError: (caught) =>
                toast.error(t('account:help.feedbackError'), {
                  description: readableDbError(caught) ?? undefined,
                }),
            },
          );
        }}
      >
        <Field label={t('account:help.category')}>
          <RadioGroup
            layout="horizontal"
            value={category}
            onChange={(_, d) => setCategory(d.value as FeedbackCategory)}
            className="flex-wrap"
          >
            {FEEDBACK_CATEGORIES.map((key) => (
              <Radio key={key} value={key} label={t(`account:help.categories.${key}`)} />
            ))}
          </RadioGroup>
        </Field>
        <Field
          label={t('account:help.message')}
          required
          validationMessage={
            submitted && tooShort
              ? t('account:help.messageShort', { count: MIN_MESSAGE })
              : undefined
          }
        >
          <Textarea
            value={message}
            rows={5}
            resize="vertical"
            maxLength={4000}
            placeholder={t('account:help.messagePlaceholder')}
            onChange={(_, d) => setMessage(d.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button
            appearance="primary"
            type="submit"
            icon={submit.isPending ? <Spinner size="tiny" /> : <Send20Regular />}
            disabled={submit.isPending}
          >
            {t('account:help.send')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

/** Hilfe & Feedback: Häufige Fragen, Kontakt zum Support, Feedback an das Team. */
export function HelpPage() {
  const { t } = useTranslation();
  return (
    <SubPage title={t('account:help.title')} description={t('account:help.description')}>
      <SectionCard title={t('account:help.faq')}>
        <Accordion collapsible>
          {FAQ.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionHeader>{t(`account:help.questions.${key}.q`)}</AccordionHeader>
              <AccordionPanel>
                <Text as="p" className="text-muted-foreground pb-2">
                  {t(`account:help.questions.${key}.a`)}
                </Text>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </SectionCard>

      <SectionCard title={t('account:help.contact')} description={t('account:help.contactHint')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button as="a" icon={<Mail20Regular />} href={`mailto:${SUPPORT_EMAIL}`}>
            {t('account:help.writeUs')}
          </Button>
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </div>
      </SectionCard>

      <FeedbackCard />
    </SubPage>
  );
}
