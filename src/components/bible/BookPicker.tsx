import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useChapterCount, type BibleBook } from '@/hooks/useBible';

/**
 * Browse to a book and chapter — the alternative to typing a reference.
 *
 * Two panes: books on the left, chapters for the highlighted book on the
 * right. Picking a book only highlights it; the jump happens when a chapter is
 * chosen, so you can look around without losing your place.
 *
 * This replaced three worse attempts, and the reasons are worth keeping:
 * a 73-button grid pushed scripture below the fold, dropdowns read as
 * generic form chrome, and a one-row dial had a 40px scroll viewport with
 * nothing visible to aim at. A list you can actually see is the answer.
 */

const GROUPS = [
  { key: 'OT', label: 'Old Testament' },
  { key: 'DC', label: 'Deuterocanonical' },
  { key: 'NT', label: 'New Testament' },
] as const;

export interface BookPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: BibleBook[];
  currentBookId: string | null;
  currentChapter: number;
  onPick: (bookId: string, chapter: number) => void;
}

export function BookPicker({
  open, onOpenChange, books, currentBookId, currentChapter, onPick,
}: BookPickerProps) {
  const [pendingId, setPendingId] = useState<string | null>(currentBookId);
  const { data: chapterCount = 0 } = useChapterCount(pendingId);

  // Reopening should always start from where the reader actually is, not from
  // whatever they browsed to and abandoned last time.
  useEffect(() => {
    if (open) setPendingId(currentBookId);
  }, [open, currentBookId]);

  const pending = books.find((b) => b.id === pendingId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle>Choose a book and chapter</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] max-h-[70vh]">
          {/* Books */}
          <div className="overflow-y-auto border-b sm:border-b-0 sm:border-r border-border max-h-[34vh] sm:max-h-[70vh]">
            {GROUPS.map((g) => {
              const items = books.filter((b) => b.testament === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key}>
                  <p className="sticky top-0 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                    {g.label}
                  </p>
                  {items.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setPendingId(b.id)}
                      className={cn(
                        'block w-full text-left px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        b.id === pendingId
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted',
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Chapters for the highlighted book */}
          <div className="overflow-y-auto p-4 max-h-[34vh] sm:max-h-[70vh]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pending ? `${pending.name} — ${chapterCount || '…'} chapters` : 'Pick a book'}
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => {
                const isCurrent = pendingId === currentBookId && c === currentChapter;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (pendingId) onPick(pendingId, c);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'h-10 text-sm tabular-nums border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isCurrent
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-card hover:bg-muted',
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
