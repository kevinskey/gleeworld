// Add/edit form for a single DocSource. Fields shown depend on `type`
// (book | journal | website | video); an "Auto-fill" input at the top can
// pull most fields from Crossref (DOI) or Open Library (ISBN) via
// lookupDOI/lookupISBN, but never blocks manual entry — a null lookup just
// shows a caption and the user fills the fields in themselves.
import { useState } from 'react';
import { Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupDOI, lookupISBN } from '@/lib/documents/sourceLookup';
import type { DocSource, SourceAuthor, SourceType } from '@/lib/documents/types';

const TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'book', label: 'Book' },
  { value: 'journal', label: 'Journal article' },
  { value: 'website', label: 'Website' },
  { value: 'video', label: 'Video' },
];

type AutoFillKind = 'doi' | 'isbn' | null;

function classifyAutoFillInput(value: string): AutoFillKind {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^10\.\d{4,}/.test(trimmed)) return 'doi';
  const digits = trimmed.replace(/[-\s]/g, '');
  if (/^\d{10}$/.test(digits) || /^\d{13}$/.test(digits)) return 'isbn';
  return null;
}

export interface SourceFormProps {
  initial?: DocSource;
  onSave: (source: DocSource) => void;
  onCancel: () => void;
}

export function SourceForm({ initial, onSave, onCancel }: SourceFormProps) {
  const [type, setType] = useState<SourceType>(initial?.type ?? 'book');
  const [authors, setAuthors] = useState<SourceAuthor[]>(
    initial?.authors && initial.authors.length > 0 ? initial.authors : [{ given: '', family: '' }]
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [container, setContainer] = useState(initial?.container ?? '');
  const [publisher, setPublisher] = useState(initial?.publisher ?? '');
  const [year, setYear] = useState(initial?.year ?? '');
  const [volume, setVolume] = useState(initial?.volume ?? '');
  const [issue, setIssue] = useState(initial?.issue ?? '');
  const [pages, setPages] = useState(initial?.pages ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [doi, setDoi] = useState(initial?.doi ?? '');
  const [isbn, setIsbn] = useState(initial?.isbn ?? '');
  const [accessed, setAccessed] = useState(initial?.accessed ?? '');

  const [autoFillValue, setAutoFillValue] = useState('');
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState<'idle' | 'no-match'>('idle');

  const autoFillKind = classifyAutoFillInput(autoFillValue);

  async function handleAutoFill() {
    if (!autoFillKind) return;
    setAutoFillLoading(true);
    setAutoFillStatus('idle');
    const trimmed = autoFillValue.trim();
    const result = autoFillKind === 'doi'
      ? await lookupDOI(trimmed)
      : await lookupISBN(trimmed.replace(/[-\s]/g, ''));
    setAutoFillLoading(false);

    if (!result) {
      setAutoFillStatus('no-match');
      return;
    }

    if (result.type) setType(result.type);
    if (result.title) setTitle(result.title);
    if (result.authors && result.authors.length > 0) setAuthors(result.authors);
    if (result.container) setContainer(result.container);
    if (result.publisher) setPublisher(result.publisher);
    if (result.year) setYear(result.year);
    if (result.volume) setVolume(result.volume);
    if (result.issue) setIssue(result.issue);
    if (result.pages) setPages(result.pages);
    if (result.doi) setDoi(result.doi);
    if (result.isbn) setIsbn(result.isbn);
  }

  function updateAuthor(index: number, field: keyof SourceAuthor, value: string) {
    setAuthors((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  }

  function addAuthor() {
    setAuthors((prev) => [...prev, { given: '', family: '' }]);
  }

  function removeAuthor(index: number) {
    setAuthors((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const cleanedAuthors = authors.filter((a) => a.given.trim() || a.family.trim());
    const source: DocSource = {
      id: initial?.id ?? crypto.randomUUID(),
      type,
      authors: cleanedAuthors,
      title: title.trim(),
      container: container.trim() || undefined,
      publisher: publisher.trim() || undefined,
      year: year.trim() || undefined,
      volume: volume.trim() || undefined,
      issue: issue.trim() || undefined,
      pages: pages.trim() || undefined,
      url: url.trim() || undefined,
      doi: doi.trim() || undefined,
      isbn: isbn.trim() || undefined,
      accessed: accessed.trim() || undefined,
    };
    onSave(source);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-3">
        <Label htmlFor="src-autofill" className="text-xs">Auto-fill from DOI or ISBN</Label>
        <div className="flex gap-2">
          <Input
            id="src-autofill"
            value={autoFillValue}
            onChange={(e) => { setAutoFillValue(e.target.value); setAutoFillStatus('idle'); }}
            placeholder="10.1000/xyz123 or 9780000000001"
            className="h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 gap-1 text-xs"
            disabled={!autoFillKind || autoFillLoading}
            onClick={handleAutoFill}
          >
            {autoFillLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Look up
          </Button>
        </div>
        {!autoFillKind && autoFillValue.trim() && (
          <p className="text-xs text-muted-foreground">Enter a DOI or ISBN</p>
        )}
        {autoFillStatus === 'no-match' && (
          <p className="text-xs text-muted-foreground">No match — fill in below</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="src-type" className="text-xs">Source type</Label>
        <Select value={type} onValueChange={(v) => setType(v as SourceType)}>
          <SelectTrigger id="src-type" className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="src-title" className="text-xs">Title</Label>
        <Input
          id="src-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Authors</Label>
        {authors.map((author, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={author.given}
              onChange={(e) => updateAuthor(i, 'given', e.target.value)}
              placeholder="Given name"
              className="h-9 text-sm"
              aria-label="Author given name"
            />
            <Input
              value={author.family}
              onChange={(e) => updateAuthor(i, 'family', e.target.value)}
              placeholder="Family name"
              className="h-9 text-sm"
              aria-label="Author family name"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 shrink-0"
              onClick={() => removeAuthor(i)}
              aria-label="Remove author"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={addAuthor}>
          <Plus className="w-4 h-4" /> Add author
        </Button>
      </div>

      {type === 'book' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="src-publisher" className="text-xs">Publisher</Label>
            <Input id="src-publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="src-year" className="text-xs">Year</Label>
              <Input id="src-year" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-isbn" className="text-xs">ISBN</Label>
              <Input id="src-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </>
      )}

      {type === 'journal' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="src-container" className="text-xs">Journal</Label>
            <Input id="src-container" value={container} onChange={(e) => setContainer(e.target.value)} placeholder="Journal title" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="src-volume" className="text-xs">Volume</Label>
              <Input id="src-volume" value={volume} onChange={(e) => setVolume(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-issue" className="text-xs">Issue</Label>
              <Input id="src-issue" value={issue} onChange={(e) => setIssue(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-pages" className="text-xs">Pages</Label>
              <Input id="src-pages" value={pages} onChange={(e) => setPages(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="src-year" className="text-xs">Year</Label>
              <Input id="src-year" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-doi" className="text-xs">DOI</Label>
              <Input id="src-doi" value={doi} onChange={(e) => setDoi(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </>
      )}

      {type === 'website' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="src-container" className="text-xs">Website name</Label>
            <Input id="src-container" value={container} onChange={(e) => setContainer(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="src-url" className="text-xs">URL</Label>
            <Input id="src-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="src-year" className="text-xs">Year</Label>
              <Input id="src-year" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-accessed" className="text-xs">Accessed</Label>
              <div className="flex gap-1.5">
                <Input
                  id="src-accessed"
                  type="date"
                  value={accessed}
                  onChange={(e) => setAccessed(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 text-xs"
                  onClick={() => setAccessed(new Date().toISOString().slice(0, 10))}
                >
                  Today
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {type === 'video' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="src-container" className="text-xs">Channel/Platform</Label>
            <Input id="src-container" value={container} onChange={(e) => setContainer(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="src-url" className="text-xs">URL</Label>
              <Input id="src-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="src-year" className="text-xs">Year</Label>
              <Input id="src-year" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" disabled={!title.trim()} onClick={handleSave}>Save source</Button>
      </div>
    </div>
  );
}
