import type { ReactNode } from 'react';

export function PageHeader({
  title,
  titleAddon,
  description,
  actions,
}: {
  title: string;
  /** Steuerelement rechts neben dem Titel, durch einen Strich getrennt. */
  titleAddon?: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
          {titleAddon ? (
            <>
              <div aria-hidden className="bg-border h-6 w-px" />
              {titleAddon}
            </>
          ) : null}
        </div>
        {description ? <p className="text-muted-foreground mt-1.5 text-sm">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
