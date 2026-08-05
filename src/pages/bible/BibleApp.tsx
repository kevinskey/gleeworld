import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Loader2, PenLine, Search, Trash2, X } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { parseReference } from '@/lib/bible/reference';
import { cn } from '@/lib/utils';
import { VerseRow } from '@/components/bible/VerseRow';
import {
  useBibleBooks, useBibleChapter, useChapterCount, useAnnotations, useBibleNotes,
  useBibleSearch, type AnnotationColor,
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
  const [search, setSearch] = useState('');
  const { data: hits = [], isFetching: searching } = useBibleSearch(search);

  // "Psalm 23" is a REFERENCE, not content — full-text search looks for those
  // words inside verse text and finds nothing. Resolve references separately
  // and offer them above the text matches. Both are shown, because a word like
  // "Mark" or "Job" is a legitimate content search as well as a book name.
  const reference = useMemo(() => {
    const r = parseReference(search);
    if (!r) return null;
    const b = books?.find((x) => x.usfm_code === r.usfmCode);
    return b ? { book: b, chapter: r.chapter, verse: r.verse } : null;
  }, [search, books]);

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

  // Rolling to the PREVIOUS book means landing on its last chapter, but that
  // count isn't known until the new book's data loads — so ask for "the end"
  // and clamp once we know.
  const [wantLastChapter, setWantLastChapter] = useState(false);
  useEffect(() => {
    if (wantLastChapter && chapterCount > 0) {
      setChapter(chapterCount);
      setWantLastChapter(false);
    }
  }, [wantLastChapter, chapterCount]);

  const bookIndex = books?.findIndex((b) => b.id === bookId) ?? -1;
  const atStart = bookIndex <= 0 && chapter <= 1;
  const atEnd = books ? bookIndex === books.length - 1 && chapter >= chapterCount : true;

  const goPrev = () => {
    if (chapter > 1) { setChapter((c) => c - 1); return; }
    if (books && bookIndex > 0) {
      setBookId(books[bookIndex - 1].id);
      setWantLastChapter(true);
    }
  };

  const goNext = () => {
    if (chapter < chapterCount) { setChapter((c) => c + 1); return; }
    if (books && bookIndex >= 0 && bookIndex < books.length - 1) {
      setBookId(books[bookIndex + 1].id);
      setChapter(1);
    }
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
            disabled={atStart}
            onClick={goPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-1">
            {chapter}/{chapterCount}
          </span>
          <Button
            variant="outline" size="icon" aria-label="Next chapter"
            disabled={atEnd}
            onClick={goNext}
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

      {/* Search IS the navigation. A wheel of 73 books plus up to 150 chapters
          was both ugly and unusable at one row tall — typing a reference or a
          phrase gets anywhere in the Bible in one move. */}
      {books && books.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Psalm 23, John 3:16, or a phrase like living water"
              aria-label="Search the Bible or jump to a passage"
              className="h-14 pl-12 pr-11 !text-base"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {search.trim().length >= 2 && (
            <Card><CardContent className="p-0 max-h-[26rem] overflow-y-auto">
              {reference && (
                <button
                  type="button"
                  onClick={() => {
                    setBookId(reference.book.id);
                    setChapter(reference.chapter);
                    setSearch('');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">
                      {reference.book.name} {reference.chapter}
                      {reference.verse ? `:${reference.verse}` : ''}
                    </span>
                    <span className="block text-xs text-muted-foreground">Open this passage</span>
                  </span>
                </button>
              )}

              {searching && (
                <p className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                </p>
              )}

              {!searching && hits.length === 0 && !reference && (
                <p className="p-4 text-sm text-muted-foreground">
                  Nothing found for “{search.trim()}”. Try a word from a verse, or a
                  reference like “Psalm 23”.
                </p>
              )}

              {hits.length > 0 && (
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {hits.length} {hits.length === 1 ? 'verse' : 'verses'}
                </p>
              )}
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setBookId(h.book.id);
                    setChapter(h.chapter);
                    setSearch('');
                  }}
                  className="block w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-xs font-semibold text-primary">
                    {h.book.name} {h.chapter}:{h.verse}
                  </span>
                  <span className="block text-sm text-foreground/90 line-clamp-2">{h.text}</span>
                </button>
              ))}
            </CardContent></Card>
          )}
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
