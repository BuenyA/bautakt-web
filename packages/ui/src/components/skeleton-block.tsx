import { makeStyles, Skeleton, SkeletonItem } from '@fluentui/react-components';

import { cn } from '../lib/cn';

const useStyles = makeStyles({
  fill: { width: '100%', height: '100%' },
});

/**
 * Platzhalter beim Laden, auf Fluents `Skeleton`.
 *
 * Größe und Rundung kommen über `className` an den Rahmen (`h-16 rounded-xl`).
 * Direkt an `SkeletonItem` verlöre Tailwind: dessen Höhe setzt Griffel
 * ungeschichtet, Tailwinds Utilities liegen in einer Cascade-Layer.
 */
export function SkeletonBlock({ className }: { className?: string }) {
  const styles = useStyles();
  return (
    <div className={cn('overflow-hidden', className)} aria-hidden>
      <Skeleton className={styles.fill}>
        <SkeletonItem shape="rectangle" className={styles.fill} />
      </Skeleton>
    </div>
  );
}
