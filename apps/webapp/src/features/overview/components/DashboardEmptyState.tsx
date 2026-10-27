import { makeStyles, Text, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

/** Kantenlänge des Symbols im Leerzustand — Kreis oder freistehendes Symbol. */
export const EMPTY_ICON_SIZE = 72;

const useStyles = makeStyles({
  // Die Fläche unter dem Kartenkopf füllen und den Inhalt darin mittig setzen.
  empty: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    minHeight: 0,
    textAlign: 'center',
  },
  // 72-px-Kreis; das Symbol darin ist 36 px (`EMPTY_ICON_SIZE / 2`).
  iconFrame: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${EMPTY_ICON_SIZE}px`,
    height: `${EMPTY_ICON_SIZE}px`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  // Der Spaltenabstand allein lässt den Knopf am Hinweis kleben.
  action: {
    marginTop: tokens.spacingVerticalM,
  },
  description: {
    color: tokens.colorNeutralForeground3,
  },
  // Titel und zweite Zeile enger als der Abstand zum Symbol.
  copy: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
  },
});

/**
 * Leerzustand einer Übersichtskarte: Symbol, Titel, optional eine zweite
 * Zeile, optional eine Aktion. Dieselben Abstände wie bisher im Einsatzplan.
 *
 * Groß gesetzt, weil die Karten auf der Startseite bis zum Bildschirmrand
 * reichen: ein kleiner Hinweis ginge in der leeren Fläche unter.
 *
 * Ein String als Titel wird gedämpft gesetzt; Einsatzplan und „Zu erledigen“
 * nutzen beide diesen Weg, damit ihre Leerzustände gleich aussehen.
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
    typeof title === 'string' ? (
      <Text size={500} className="text-muted-foreground">
        {title}
      </Text>
    ) : (
      title
    );
  const descriptionNode =
    description == null ? null : typeof description === 'string' ? (
      <Text size={400} className={styles.description}>
        {description}
      </Text>
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
