import { Caption1, makeStyles, Text, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  // Die Fläche unter dem Kartenkopf füllen und den Inhalt darin mittig setzen.
  empty: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    minHeight: 0,
    textAlign: 'center',
  },
  // 48-px-Kreis, bisher direkt im Einsatzplan. Das Symbol darin bleibt 24 px.
  iconFrame: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  // Der Spaltenabstand allein lässt den Knopf am Hinweis kleben.
  action: {
    marginTop: tokens.spacingVerticalS,
  },
  description: {
    color: tokens.colorNeutralForeground3,
  },
  // Titel und zweite Zeile enger als der Abstand zum Symbol.
  copy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
  },
});

/**
 * Leerzustand einer Übersichtskarte: Symbol, Titel, optional eine zweite
 * Zeile, optional eine Aktion. Dieselben Abstände wie bisher im Einsatzplan.
 *
 * Ein String als Titel wird gedämpft gesetzt — so bleibt der Einsatzplan.
 * „Zu erledigen“ übergibt eine starke Zeile und die Caption als Beschreibung.
 */
export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  const styles = useStyles();
  const titleNode =
    typeof title === 'string' ? <Text className="text-muted-foreground">{title}</Text> : title;
  const descriptionNode =
    description == null ? null : typeof description === 'string' ? (
      <Caption1 className={styles.description}>{description}</Caption1>
    ) : (
      description
    );

  return (
    <div className={styles.empty}>
      {icon}
      {descriptionNode ? (
        <div className={styles.copy}>
          {titleNode}
          {descriptionNode}
        </div>
      ) : (
        titleNode
      )}
      {action ? <span className={styles.action}>{action}</span> : null}
    </div>
  );
}

/** Kreis um das Symbol, wie bisher im leeren Einsatzplan. */
export function DashboardEmptyIcon({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <span className={styles.iconFrame}>{children}</span>;
}
