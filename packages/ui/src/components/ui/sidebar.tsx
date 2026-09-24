'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronLeftIcon, ChevronRightIcon, PanelLeftIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Button } from './button';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

/**
 * Sidebar-Bausatz nach shadcn/ui.
 *
 * ⚠️ `'use client'` steht hier und in allen Komponenten mit Hooks, Context oder
 * Radix-Primitiven, weil `apps/marketing` (Next App Router) aus derselben
 * Sammel-Datei importiert. Ohne die Kennzeichnung landen sie im Server-Graph,
 * und dort fehlen client-seitige Exporte — `react-hook-form` etwa liefert unter
 * der `react-server`-Bedingung kein `Controller`, und der Marketing-Build
 * bricht ab. Vite ignoriert die Zeile, sie kostet also nichts.
 *
 * Zustand (auf/zu) landet in einem Cookie und nicht im localStorage: so steht
 * er beim ersten Render schon fest und die Leiste springt nach dem Laden nicht
 * von breit auf schmal.
 *
 * Eingeklappt bleibt die Leiste als Icon-Spalte stehen (`collapsible="icon"`).
 * Das ist Absicht — wer sie ganz ausblendet, verliert am Desktop die Anzeige,
 * wo er gerade ist.
 *
 * Optik (2026-09-24, Expo Docs): 240px / eingeklappt 64px, weisse Flaeche,
 * graue Pill fuer den aktiven Eintrag. Die Farben stehen in theme.css
 * (`--sidebar*`), nicht als Primary-Fill.
 */
const SIDEBAR_COOKIE_NAME = 'bautakt_sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SIDEBAR_WIDTH = '15rem';
const SIDEBAR_WIDTH_MOBILE = '15rem';
const SIDEBAR_WIDTH_ICON = '4rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';
const MOBILE_BREAKPOINT = 1024;

type SidebarContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar muss innerhalb von <SidebarProvider> benutzt werden.');
  return context;
}

/** Unterhalb von 1024px ist die Sidebar ein Overlay, kein Teil des Layouts. */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    query.addEventListener('change', onChange);
    onChange();
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) setOpenProp(next);
      else setInternalOpen(next);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value);
    else setOpen((value) => !value);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn('group/sidebar-wrapper flex min-h-svh w-full', className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = 'left',
  collapsible = 'icon',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  collapsible?: 'icon' | 'offcanvas' | 'none';
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          'bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          side={side}
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Bereiche der Bautakt-Webapp</SheetDescription>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Der Kreis sitzt halb auf der Border. Im overflow-hidden der Leiste
  // würde er abgeschnitten — deshalb als Geschwister ausserhalb.
  const { rail, rest } = partitionSidebarChildren(children);

  return (
    <div
      className="group peer text-sidebar-foreground hidden lg:block"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      data-slot="sidebar"
    >
      {/* Platzhalter, der die Breite im Fluss haelt — die Leiste selbst ist fixiert. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          'fixed inset-y-0 z-30 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear lg:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
          side === 'left' ? 'border-sidebar-border border-r' : 'border-sidebar-border border-l',
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          className="bg-sidebar flex h-full w-full flex-col overflow-hidden"
        >
          {rest}
        </div>
        {rail}
      </div>
    </div>
  );
}

/**
 * Kreis unten an der rechten Kante, halb über der Border.
 * Hit-Flaeche 32px, sichtbarer Kreis 28px. Chevron zeigt die Richtung.
 */
function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar, state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const label = collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen';
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={label}
      title={label}
      onClick={toggleSidebar}
      className={cn(
        'group/rail absolute right-0 bottom-5 z-40 hidden size-8 translate-x-1/2 items-center justify-center rounded-full lg:flex',
        'focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'bg-card text-muted-foreground border-sidebar-border flex size-7 items-center justify-center rounded-full border transition-colors',
          'group-hover/rail:border-border-strong group-hover/rail:text-foreground',
          'group-focus-visible/rail:border-border-strong group-focus-visible/rail:text-foreground',
        )}
      >
        {collapsed ? (
          <ChevronRightIcon className="size-4" />
        ) : (
          <ChevronLeftIcon className="size-4" />
        )}
      </span>
    </button>
  );
}

/** Zieht die Collapse-Kontrolle aus dem scrollenden Innenleben der Leiste. */
function partitionSidebarChildren(children: React.ReactNode): {
  rail: React.ReactNode[];
  rest: React.ReactNode[];
} {
  const rail: React.ReactNode[] = [];
  const rest: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === SidebarRail) rail.push(child);
    else rest.push(child);
  });
  return { rail, rest };
}

/** Der Inhaltsbereich neben der Sidebar. */
function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn('bg-background relative flex min-h-svh min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, open, isMobile } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('size-9', className)}
      aria-label={open && !isMobile ? 'Seitenleiste einklappen' : 'Seitenleiste ausklappen'}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className="size-5" />
    </Button>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-2 px-3 py-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-2 px-3 py-2', className)}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('bg-sidebar-border mx-3 w-auto', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-0 overflow-x-hidden overflow-y-auto pt-2 pb-2 group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col px-3 py-0', className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        'text-text-subtle flex shrink-0 items-center px-2.5 pt-4 pb-1.5 text-xs font-semibold transition-[margin,opacity] duration-200 ease-linear',
        'group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  [
    'peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-left text-sm font-medium outline-hidden transition-colors',
    'min-h-10',
    'text-text-secondary',
    'hover:bg-sidebar-accent-hover hover:text-foreground',
    'focus-visible:bg-sidebar-accent-hover focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
    'data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground',
    'data-[active=true]:hover:bg-sidebar-accent data-[active=true]:hover:text-sidebar-accent-foreground',
    'data-[active=true]:focus-visible:bg-sidebar-accent',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&>span:last-child]:truncate',
    'group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
    'group-data-[collapsible=icon]:[&>span:last-child]:hidden',
  ].join(' '),
  {
    variants: {
      variant: {
        default: '',
        outline:
          'bg-background border-sidebar-border hover:bg-sidebar-accent-hover border shadow-[0_0_0_1px_var(--sidebar-border)]',
      },
      size: {
        default: 'text-sm',
        lg: 'min-h-12 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant,
  size,
  tooltip,
  className,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean;
    isActive?: boolean;
    /** Wird nur eingeblendet, solange die Leiste eingeklappt ist. */
    tooltip?: string;
  }) {
  const Comp = asChild ? Slot : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'text-sidebar-primary-foreground bg-sidebar-primary pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none',
        'peer-data-[size=default]/menu-button:top-2 peer-data-[size=lg]/menu-button:top-3.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = true,
  ...props
}: React.ComponentProps<'div'> & { showIcon?: boolean }) {
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      className={cn('flex min-h-10 items-center gap-2.5 rounded-md px-2.5', className)}
      {...props}
    >
      {showIcon ? <Skeleton className="size-4 shrink-0 rounded-md" /> : null}
      <Skeleton className="h-4 max-w-(--skeleton-width) flex-1" />
    </div>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
