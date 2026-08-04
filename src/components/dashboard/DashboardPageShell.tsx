// DashboardPageShell — the canonical wrapper for standard dashboard pages.
// Owns the page's max-width, horizontal padding, vertical rhythm, and the
// title/subtitle header block so individual pages stop hand-rolling them.
//
// Vertical padding note: DashboardShell's <main> already applies pt-3 sm:pt-4,
// so this shell only adds pt-5 sm:pt-6 — the combined offset matches the
// pt-8/pt-10 the migrated pages used standalone. Pages must NOT add their
// own top padding on top of this.
//
// Full-height layouts (chat, calendar) that can't use the container can still
// use <PageTitle> alone for a consistent h1.

import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

// One face, one size, one weight for every page title. A `serif` variant
// existed briefly for the House greeting; it was removed because a title
// that reads differently from every other title just looks like a mistake,
// however deliberate it was.
//
// The explicit !text-[…] sizes override the global `h1 { clamp(…) }` reset in
// index.css, which otherwise pushes page titles to 40px+ on wide monitors.
export function PageTitle({ children, icon: Icon, className }: PageTitleProps) {
  return (
    <h1
      className={cn(
        '!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight',
        Icon && 'flex items-center gap-2',
        className,
      )}
    >
      {Icon && <Icon className="w-7 h-7 text-primary" />}
      {children}
    </h1>
  );
}

interface DashboardPageShellProps {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Small uppercase eyebrow above the title (e.g. "Music", "Academy").
   *  Tenant-tinted; when present, replaces the visual monotone of a bare h1. */
  eyebrow?: string;
  /** Right-aligned header actions (buttons, filters). */
  actions?: ReactNode;
  maxWidth?: '4xl' | '6xl' | '7xl' | 'full';
  className?: string;
  children: ReactNode;
}

// Left-padding tokens are shared with any hand-rolled dashboard page that
// wants its title to land at the same X as everyone else.
export const DASHBOARD_PAGE_PADDING = 'px-4 sm:px-6 lg:px-8';

const MAX_WIDTH_CLASSES: Record<NonNullable<DashboardPageShellProps['maxWidth']>, string> = {
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function DashboardPageShell({
  title,
  subtitle,
  icon,
  eyebrow,
  actions,
  maxWidth = '6xl',
  className,
  children,
}: DashboardPageShellProps) {
  // Anchored to the left edge (no mx-auto) so page titles land at the exact
  // same X coordinate across every page regardless of `maxWidth`. Vertical
  // padding is fixed so the title's Y is also stable across navigations.
  //
  // Header carries a subtle tenant-tinted rule underneath (border-primary/15)
  // to break up the all-gray page rhythm — every page gets one guaranteed
  // moment of tenant color without touching per-page markup.
  return (
    <div
      className={cn(
        'w-full pt-5 sm:pt-6 pb-10 space-y-6',
        DASHBOARD_PAGE_PADDING,
        MAX_WIDTH_CLASSES[maxWidth],
        className,
      )}
    >
      <header className="flex items-end justify-between gap-3 flex-wrap pb-4 border-b border-primary/15">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              {eyebrow}
            </p>
          )}
          <PageTitle icon={icon}>{title}</PageTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export default DashboardPageShell;
