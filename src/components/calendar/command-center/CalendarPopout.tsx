// Uniform floating pop-out panel for the calendar surface (Filters, List,
// Office Hours — and any future calendar pop-out). One width, one motion,
// one scrim, so the iPad calendar reads as a single system, Apple
// Calendar-style. Composes the sheet primitives directly (not
// SheetContent) so the overlay tint and panel geometry are owned here.
// Spec: docs/superpowers/specs/2026-07-06-calendar-popout-uniform-design.md
import { type ReactNode } from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Sheet, SheetPortal, SheetOverlay } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface CalendarPopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Hairline border under the header (Office Hours uses it). */
  headerBorder?: boolean;
  children: ReactNode;
}

export function CalendarPopout({ open, onOpenChange, title, headerBorder, children }: CalendarPopoutProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/30 motion-reduce:animate-none" />
        <SheetPrimitive.Content
          data-calendar-popout=""
          className={cn(
            'fixed z-50 left-3 inset-y-3 w-[min(420px,calc(100vw-24px))]',
            'flex flex-col bg-background border border-border shadow-xl p-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-[350ms] data-[state=closed]:duration-300',
            'ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none',
          )}
        >
          <div className={cn('px-5 pt-5 pb-2 text-left', headerBorder && 'border-b border-border')}>
            <SheetPrimitive.Title className="text-lg font-bold">{title}</SheetPrimitive.Title>
            <SheetPrimitive.Description className="sr-only">{title} panel</SheetPrimitive.Description>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</div>
          <SheetPrimitive.Close className="absolute right-3 top-3 z-50 flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
