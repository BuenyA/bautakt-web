import { toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Spinner,
} from '@fluentui/react-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { readableDbError } from '@/lib/dbErrors';
import { HOME_ROUTE } from '@/lib/routes';

import { extractInviteToken, invitationErrorKey } from './invitations';
import { useJoinCompany } from './useMyCompanies';

/**
 * Einem weiteren Betrieb beitreten: Einladungscode oder -link einfügen. Den
 * Code erzeugt der Betrieb unter „Mitarbeiter hinzufügen“ — in App und Web
 * derselbe.
 */
export function JoinCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const join = useJoinCompany();
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const token = extractInviteToken(code);
  const error = submitted && !token ? t('account:join.invalid') : undefined;

  function close(next: boolean) {
    if (join.isPending) return;
    onOpenChange(next);
    if (!next) {
      setCode('');
      setSubmitted(false);
    }
  }

  async function submit() {
    setSubmitted(true);
    if (!token) return;
    try {
      await join.mutateAsync(token);
      toast.success(t('account:join.success'));
      close(false);
      void navigate(HOME_ROUTE);
    } catch (caught) {
      const key = invitationErrorKey(caught);
      toast.error(t('account:join.error'), {
        description: key === 'errors:generic' ? (readableDbError(caught) ?? undefined) : t(key),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => close(data.open)}>
      <DialogSurface>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <DialogBody>
            <DialogTitle>{t('account:join.title')}</DialogTitle>
            <DialogContent className="flex flex-col gap-3">
              <p>{t('account:join.description')}</p>
              <Field label={t('account:join.code')} required validationMessage={error}>
                <Input
                  value={code}
                  autoComplete="off"
                  placeholder={t('account:join.placeholder')}
                  onChange={(_, d) => setCode(d.value)}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => close(false)} disabled={join.isPending}>
                {t('common:action.cancel')}
              </Button>
              <Button
                appearance="primary"
                type="submit"
                disabled={join.isPending}
                icon={join.isPending ? <Spinner size="tiny" /> : undefined}
              >
                {t('account:join.submit')}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
