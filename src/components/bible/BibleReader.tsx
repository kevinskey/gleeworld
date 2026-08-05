import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, ChevronLeft, ChevronRight, Loader2, PenLine, Search, Settings2, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VerseRow } from '@/components/bible/VerseRow';
import type {
  AnnotationColor, BibleAnnotation, BibleBook, BibleNote, BibleSearchHit, BibleVerse,
} from '@/hooks/useBible';

/**
 * Reading mode — the page-like view.
 *
 * A fixed overlay rather than a route, so the reader keeps the book, chapter,
 * marks and notes already loaded behind it and exits instantly. It sits above
 * the dashboard chrome, so on a phone or iPad the scripture gets the whole
 * screen with nothing but text on it.
 *
 * Tools live in a left flyout behind an edge tab, so nothing floats over the
 * text while you read. Safe-area insets are honoured because this covers the
 * status bar in the iOS shell, where a naive inset-0 would put the first verse
 * under the clock.
 *
 * PORTALLED TO document.body ON PURPOSE. Rendered in place, the dashboard
 * header showed through the top of the overlay — not a z-index problem (the
 * shell bar is z-30) but a containing-block one: an ancestor
 * with transform/filter/contain makes position:fixed resolve against that
 * ancestor instead of the viewport, trapping the overlay inside the content
 * column. A portal escapes it entirely, which is the same reason Radix's own
 * Dialog and Sheet portal.
 */

const COLORS: AnnotationColor[] = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple'];

const SWATCH: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-300', green: 'bg-green-400', blue: 'bg-blue-400',
  pink: 'bg-pink-400', orange: 'bg-orange-400', purple: 'bg-purple-500',
};

const SIZES = [
  { key: 'sm', label: 'Small', cls: 'text-base' },
  { key: 'md', label: 'Medium', cls: 'text-lg' },
  { key: 'lg', label: 'Large', cls: 'text-xl' },
  { key: 'xl', label: 'Extra large', cls: 'text-2xl' },
] as const;

export interface BibleReaderProps {
  book: BibleBook | null;
  chapter: number;
  chapterCount: number;
  verses: BibleVerse[];
  versesLoading: boolean;
  annotations: BibleAnnotation[];
  notes: BibleNote[];
  color: AnnotationColor;
  onColorChange: (c: AnnotationColor) => void;
  onMark: (verse: number, pointerType: string) => void;
  onOpenNote: (verse: number) => void;
  onDeleteNote: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  atStart: boolean;
  atEnd: boolean;
  search: string;
  onSearchChange: (q: string) => void;
  searching: boolean;
  hits: BibleSearchHit[];
  reference: { book: BibleBook; chapter: number; verse: number | null } | null;
  onGoTo: (bookId: string, chapter: number) => void;
  onExit: () => void;
  onBrowse: () => void;
}

export function BibleReader(props: BibleReaderProps) {
  const {
    book, chapter, chapterCount, verses, versesLoading, annotations, notes,
    color, onColorChange, onMark, onOpenNote, onDeleteNote,
    onPrev, onNext, atStart, atEnd,
    search, onSearchChange, searching, hits, reference, onGoTo, onExit, onBrowse,
  } = props;

  const [toolsOpen, setToolsOpen] = useState(false);
  const [size, setSize] = useState<(typeof SIZES)[number]['key']>('md');
  const sizeCls = SIZES.find((s) => s.key === size)!.cls;

  const noteFor = (v: number) => notes.find((n) => n.verse === v) ?? null;

  // Stop the page behind from scrolling while the reader is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape closes, matching every other overlay in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !toolsOpen) onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toolsOpen, onExit]);

  const jump = (bookId: string, ch: number) => {
    onGoTo(bookId, ch);
    onSearchChange('');
    setToolsOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-background overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Edge tab — the only chrome over the text. */}
      <button
        type="button"
        onClick={() => setToolsOpen(true)}
        aria-label="Open reading tools"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-10 flex h-20 w-7 items-center justify-center border border-l-0 border-border bg-card shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden />
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        aria-label="Close reading mode"
        className="fixed right-2 z-10"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        <X className="w-5 h-5" />
      </Button>

      {/* The page itself: one comfortable measure, centred. */}
      {/* Measure grows with the viewport instead of sitting at one narrow
          column — a 38rem block on a 1700px desktop is mostly margin. Still
          capped, because a full-width line of scripture is unreadable. */}
      <div className="mx-auto w-full max-w-[34rem] md:max-w-2xl lg:max-w-4xl xl:max-w-5xl px-5 sm:px-8 lg:px-10 py-10 sm:py-14">
        <header className="mb-8 text-center">
          <button
            type="button"
            onClick={onBrowse}
            className="mx-auto flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Choose a book and chapter"
          >
            <h1 className="!text-2xl sm:!text-3xl font-bold tracking-tight">
              {book?.name} {chapter}
            </h1>
            <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden />
          </button>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Chapter {chapter} of {chapterCount}
          </p>
        </header>

        {versesLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        )}

        <div className="space-y-1">
          {verses.map((v) => (
            <VerseRow
              key={v.id}
              textClassName={sizeCls}
              verse={v}
              annotations={annotations.filter((a) => a.verse === v.verse)}
              hasNote={!!noteFor(v.verse)}
              onMark={onMark}
              onOpenNote={onOpenNote}
            />
          ))}
        </div>

        <nav className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" onClick={onPrev} disabled={atStart}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <Button variant="ghost" onClick={onNext} disabled={atEnd}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </nav>
      </div>

      {/* Tools flyout */}
      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent
          side="left"
          // z-[95] on purpose: the reader overlay is z-[90], and the Sheet
          // primitive defaults to z-50 — without this the flyout opens
          // BEHIND the reader and looks like the tab does nothing.
          className="w-full sm:max-w-sm overflow-y-auto z-[95]"
        >
          <SheetHeader>
            <SheetTitle>Reading tools</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Find a passage or phrase
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Psalm 23, or living water"
                  aria-label="Search the Bible"
                  className="pl-9"
                />
              </div>

              {search.trim().length >= 2 && (
                <div className="border border-border max-h-64 overflow-y-auto">
                  {reference && (
                    <button
                      type="button"
                      onClick={() => jump(reference.book.id, reference.chapter)}
                      className="block w-full text-left px-3 py-2.5 border-b border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block text-sm font-semibold text-primary">
                        {reference.book.name} {reference.chapter}
                        {reference.verse ? `:${reference.verse}` : ''}
                      </span>
                      <span className="block text-xs text-muted-foreground">Open this passage</span>
                    </button>
                  )}
                  {searching && (
                    <p className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                    </p>
                  )}
                  {!searching && !hits.length && !reference && (
                    <p className="p-3 text-sm text-muted-foreground">Nothing found.</p>
                  )}
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => jump(h.book.id, h.chapter)}
                      className="block w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-xs font-semibold text-primary">
                        {h.book.name} {h.chapter}:{h.verse}
                      </span>
                      <span className="block text-xs text-foreground/80 line-clamp-2">{h.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Marking
              </h3>
              <div className="flex items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Mark in ${c}`}
                    aria-pressed={c === color}
                    onClick={() => onColorChange(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      SWATCH[c],
                      c === color ? 'border-foreground' : 'border-transparent',
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <PenLine className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                Tap a verse to highlight it. An Apple Pencil underlines instead. Tap
                again to clear.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Text size
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSize(s.key)}
                    aria-pressed={s.key === size}
                    className={cn(
                      'px-3 py-1.5 text-xs border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      s.key === size ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your notes in {book?.name} {chapter}
              </h3>
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No notes here yet. Tap a verse number to write one.
                </p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="border border-border p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {book?.name} {n.chapter}{n.verse ? `:${n.verse}` : ''}
                      </p>
                      <p className="text-sm whitespace-pre-wrap break-words">{n.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(n.id)}
                      aria-label="Delete note"
                      className="shrink-0 p-1 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">Your notes and marks are private to you.</p>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>,
    document.body,
  );
}
