import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Loader2, PenLine, Trash2 } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VerseRow } from '@/components/bible/VerseRow';
import {
  useBibleBooks, useBibleChapter, useChapterCount, useAnnotations, useBibleNotes,
  type AnnotationColor,
} from '@/hooks/useBible';

/**
 * The Bible — read, mark, and take notes.
 *
 * Marking model: tapping a verse toggles a mark. The Apple Pencil produces an
 * UNDERLINE, a finger or mouse a HIGHLIGHT, decided from the pointer event's
 * pointerType in VerseRow. Tapping an already-marked verse in the same style
 * clears it, so there's no separate erase mode to discover.
 */

const COLORS: AnnotationColor[] = ['yellow', 'green', 'blue', 'pink', 'orange', 'purple'];

const SWATCH: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-300', green: 'bg-green-400', blue: 'bg-blue-400',
  pink: 'bg-pink-400', orange: 'bg-orange-400', purple: 'bg-purple-500',
};

export default function BibleApp() {
  const { data: books, isLoading: booksLoading } = useBibleBooks();
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapter, setChapter] = useState(1);
  const [color, setColor] = useState<AnnotationColor>('yellow');
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const book = useMemo(() => books?.find((b) => b.id === bookId) ?? null, [books, bookId]);

  // Default to John — a kinder landing place than Genesis 1 for a reader
  // opening the app cold.
  useEffect(() => {
    if (!bookId && books?.length) {
      setBookId((books.find((b) => b.usfm_code === 'JHN') ?? books[0]).id);
    }
  }, [books, bookId]);

  const { data: verses, isLoading: versesLoading } = useBibleChapter(bookId, chapter);
  const { data: chapterCount = 1 } = useChapterCount(bookId);
  const { annotations, add, remove } = useAnnotations(book?.usfm_code ?? null, chapter);
  const { notes, save, remove: removeNote } = useBibleNotes(book?.usfm_code ?? null, chapter);

  const noteFor = (v: number | null) => notes.find((n) => n.verse === v) ?? null;

  useEffect(() => {
    setDraft(noteVerse === null ? '' : noteFor(noteVerse)?.body ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteVerse, notes]);

  const handleMark = (verse: number, pointerType: string) => {
    const style = pointerType === 'pen' ? 'underline' : 'highlight';
    const existing = annotations.find(
      (a) => a.verse === verse && a.style === style && a.start_offset === null,
    );
    if (existing) {
      remove.mutate(existing.id);
      return;
    }
    add.mutate({ verse, style, color, createdVia: pointerType });
  };

  const isNotInstalled = !booksLoading && books === null;

  return (
    <DashboardPageShell
      eyebrow="The Bible"
      title={book ? `${book.name} ${chapter}` : 'The Bible'}
      icon={BookOpen}
      subtitle="Read, highlight, underline with Apple Pencil, and keep your notes."
      maxWidth="4xl"
      actions={
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" aria-label="Previous chapter"
            disabled={chapter <= 1}
            onClick={() => setChapter((c) => Math.max(1, c - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-1">
            {chapter}/{chapterCount}
          </span>
          <Button
            variant="outline" size="icon" aria-label="Next chapter"
            disabled={chapter >= chapterCount}
            onClick={() => setChapter((c) => Math.min(chapterCount, c + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      {isNotInstalled && (
        <Card><CardContent className="p-6 space-y-2">
          <h2 className="text-base font-semibold">The Bible isn’t loaded on this site yet</h2>
          <p className="text-sm text-muted-foreground">
            Once an administrator applies the scripture setup, the full text will appear here.
          </p>
        </CardContent></Card>
      )}

      {/* Book + chapter pickers */}
      {books && books.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {books.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setBookId(b.id); setChapter(1); }}
                className={cn(
                  'px-2 py-1 text-xs border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  b.id === bookId ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChapter(c)}
                className={cn(
                  'w-8 h-8 text-xs tabular-nums border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  c === chapter ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Marking colour + how it works */}
      {books && books.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-y border-border py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mark with
          </span>
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Mark in ${c}`}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  SWATCH[c],
                  c === color ? 'border-foreground' : 'border-transparent',
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5" aria-hidden />
            Tap a verse to highlight. Apple Pencil underlines. Tap again to clear.
          </p>
        </div>
      )}

      {versesLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading the chapter…
        </div>
      )}

      {verses && verses.length > 0 && (
        <Card><CardContent className="p-4 sm:p-6">
          {verses.map((v) => (
            <VerseRow
              key={v.id}
              verse={v}
              annotations={annotations.filter((a) => a.verse === v.verse)}
              hasNote={!!noteFor(v.verse)}
              onMark={handleMark}
              onOpenNote={setNoteVerse}
            />
          ))}
        </CardContent></Card>
      )}

      {notes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes in this chapter
          </h2>
          {notes.map((n) => (
            <Card key={n.id}><CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  {book?.name} {n.chapter}{n.verse ? `:${n.verse}` : ''}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{n.body}</p>
              </div>
              <Button
                variant="ghost" size="icon" aria-label="Delete note"
                onClick={() => removeNote.mutate(n.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent></Card>
          ))}
        </section>
      )}

      <Sheet open={noteVerse !== null} onOpenChange={(o) => !o && setNoteVerse(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              Note on {book?.name} {chapter}:{noteVerse}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pt-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              placeholder="What do you want to remember about this verse?"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const existing = noteFor(noteVerse);
                  save.mutate(
                    { id: existing?.id, verse: noteVerse, body: draft },
                    { onSuccess: () => setNoteVerse(null) },
                  );
                }}
                disabled={!draft.trim() || save.isPending}
              >
                {save.isPending ? 'Saving…' : 'Save note'}
              </Button>
              <Button variant="ghost" onClick={() => setNoteVerse(null)}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your notes and marks are private to you.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardPageShell>
  );
}
