// Collapsible left-column nav for the Viewer reader on iPad / desktop.
// Replaces the ☰ Tools hamburger sheet on wide screens — every tool the
// reader exposes is one tap away on a persistent rail. Two widths: an
// icon-only 56px collapsed rail and a 240px expanded panel with labels
// and descriptions.

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SideNavItem {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  note?: string;
  onClick: () => void;
  active?: boolean;
}

interface ViewerSideNavProps {
  items: SideNavItem[];
  collapsed: boolean;
  onToggle: () => void;
  footer?: React.ReactNode;
}

export function ViewerSideNav({ items, collapsed, onToggle, footer }: ViewerSideNavProps) {
  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-card/95 backdrop-blur border-r border-border shrink-0 transition-all duration-200',
        collapsed ? 'w-16' : 'w-72',
      )}
    >
      <div className="flex items-center justify-end px-2 py-2 border-b border-border">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand tools nav' : 'Collapse tools nav'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {items.map((it, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={it.onClick}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent/40 rounded-lg text-left transition-colors',
                  it.active && 'bg-accent text-accent-foreground',
                )}
                title={collapsed ? it.label : undefined}
              >
                <span className={cn('rounded-md bg-muted p-2 shrink-0', it.active && 'bg-primary text-primary-foreground')}>
                  <it.Icon className="w-5 h-5" />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-tight">{it.label}</span>
                    {it.note && (
                      <span className="block text-[12px] text-muted-foreground leading-snug mt-0.5">
                        {it.note}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {footer && (
        <div className="border-t border-border p-3">
          {footer}
        </div>
      )}
    </aside>
  );
}
