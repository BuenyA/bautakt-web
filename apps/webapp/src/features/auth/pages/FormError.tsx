import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

/** Nimmt einen i18n-Key entgegen, nie einen fertigen Text. */
export function FormError({ messageKey }: { messageKey: string | null }) {
  const { t } = useTranslation();
  if (!messageKey) return null;
  return (
    <MessageBar intent="error" role="alert">
      <MessageBarBody>{t(messageKey)}</MessageBarBody>
    </MessageBar>
  );
}
