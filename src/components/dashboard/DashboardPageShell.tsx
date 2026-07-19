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
import { PageContainer } from '@/components/layout/PageContainer';

interface PageTitleProps {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
  /**
   * Serif voice, for pages that address the user rather than name a
   * destination — the House greeting ("Evening, Kevin") and People. Keeps
   * the shared size and tracking so these titles still line up with every
   * other page; only the family and weight differ.
   */
  serif?: boolean;
}

// The explicit !text-[…] sizes override the global `h1 { clamp(…) }` reset in
// index.css, which otherwise pushes page titles to 40px+ on wide monitors.
export function PageTitle({ children, icon: Icon, className, serif }: PageTitleProps) {
  return (
    <h1
      className={cn(
        '!text-[1.4rem] sm:!text-[2rem] tracking-tight',
        serif ? 'font-serif font-semibold' : 'font-bold',
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
  /** Right-aligned header actions (buttons, filters). */
  actions?: ReactNode;
  maxWidth?: '4xl' | '6xl' | '7xl' | 'full';
  className?: string;
  children: ReactNode;
}

export function DashboardPageShell({
  title,
  subtitle,
  icon,
  actions,
  maxWidth = '6xl',
  className,
  children,
}: DashboardPageShellProps) {
  return (
    <PageContainer
      maxWidth={maxWidth}
      padded={false}
      className={cn('pt-5 sm:pt-6 pb-10 space-y-6', className)}
    >
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <PageTitle icon={icon}>{title}</PageTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </PageContainer>
  );
}

export default DashboardPageShell;
