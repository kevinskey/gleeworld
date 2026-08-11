# Documents: In-App Word Processor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students write a complete research paper (footnotes, citations, works cited, MLA/APA export) inside GleeWorld — a personal Documents library in My World.

**Architecture:** One new owner-private table (`gw_personal_docs`), a TipTap-3-based `DocumentEditor` with a custom atomic `citationChip` node and an in-house footnote system, pure-function citation formatters (MLA 9 / APA 7), and client-side export (`docx` library for .docx, print stylesheet for PDF). Spec: `docs/superpowers/specs/2026-08-11-documents-word-processor-design.md`.

**Tech Stack:** React 18 + Vite + TypeScript, TipTap 3 (`@tiptap/react` 3.26 already installed), Supabase (self-hosted), `docx` npm library, vitest.

## Global Constraints

- Work in the worktree `~/Documents/GitHub/gleeworld-wt-docs-spec` (branch `docs/word-processor-spec`). Run `npm ci --legacy-peer-deps` there once before anything; NEVER pipe it to `tail` (hides failures).
- Test command: `npx vitest run <file>` (script `npm test` = `vitest run`).
- Supabase client import: `import { supabase } from "@/integrations/supabase/client";`
- Every Supabase write ends with `.select()` and treats an empty result as failure (demo-tenant writes fail silently otherwise).
- Light theme tokens only (`bg-card`, `text-muted-foreground`, etc.) — never hardcode colors; never set `color` on bare h1–h6.
- Toolbar/panel sizing: `text-xs`/`text-sm`, icons `w-4 h-4` minimum.
- User-facing copy says "students", never "singers"/"members"; tenant-neutral (no school names).
- No swipe navigation; no service worker; no new external hosts without adding them to the CSP `connect-src` meta tag in `index.html`.
- Commit after every task with a conventional-commit message ending in the Claude co-author trailer.
- The generated Supabase types file is NOT regenerated in this plan; new-table queries cast via helper types defined in Task 4.

---

### Task 1: Migration + migration test for `gw_personal_docs`

**Files:**
- Create: `supabase/migrations/20260811230000_personal_docs.sql`
- Create: `supabase/migrations/tests/personal_docs_test.sql`

**Interfaces:**
- Produces: table `public.gw_personal_docs` with columns `id, user_id, title, content, citation_style, sources, footnotes, paper_meta, word_count, created_at, updated_at`; owner-only RLS on all four verbs.

- [ ] **Step 1: Read the pattern file** — `supabase/migrations/20260712120000_personal_music_library.sql` and `supabase/migrations/tests/personal_music_library_test.sql` (mirror both exactly in structure).

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/20260811230000_personal_docs.sql
-- Documents word processor (spec: docs/superpowers/specs/2026-08-11-documents-word-processor-design.md)
--
-- gw_personal_docs intentionally has NO tenant_id: personal documents follow
-- the person across tenants, like gw_personal_scores. Multi-tenant RLS
-- audits: this is a deliberate exception.

CREATE TABLE IF NOT EXISTS public.gw_personal_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  citation_style text NOT NULL DEFAULT 'mla9' CHECK (citation_style IN ('mla9','apa7')),
  sources jsonb NOT NULL DEFAULT '[]',
  footnotes jsonb NOT NULL DEFAULT '[]',
  paper_meta jsonb NOT NULL DEFAULT '{}',
  word_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_personal_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_personal_docs_select ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_select ON public.gw_personal_docs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_docs_insert ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_insert ON public.gw_personal_docs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_docs_update ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_update ON public.gw_personal_docs
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gw_personal_docs_delete ON public.gw_personal_docs;
CREATE POLICY gw_personal_docs_delete ON public.gw_personal_docs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS gw_personal_docs_user_idx
  ON public.gw_personal_docs (user_id, updated_at DESC);
```

(`footnotes jsonb` is a spec addition settled at plan time: footnote text lives beside the doc JSON, keyed by note id — see Task 7.)

- [ ] **Step 3: Write the migration test** — copy the assertion structure of `personal_music_library_test.sql`, asserting: table exists, RLS enabled (`relrowsecurity`), exactly 4 policies named `gw_personal_docs_%`, and the CHECK constraint on `citation_style`. Follow the existing DO-block style verbatim.

- [ ] **Step 4: Sanity-check the SQL parses** — `psql` is not available locally against prod; instead verify by eye against the pattern file and run `node -e "1"`-level check only. The migration is applied at deploy time via the established `-U supabase_admin` process (PR #380 conventions) — do NOT attempt to apply it from this machine.

- [ ] **Step 5: Commit** — `git add supabase/migrations/ && git commit -m "feat(documents): gw_personal_docs table with owner-only RLS"`

---

### Task 2: Citation types + MLA 9 / APA 7 formatters (pure functions, TDD)

**Files:**
- Create: `src/lib/documents/types.ts`
- Create: `src/lib/documents/citationFormat.ts`
- Test: `src/lib/documents/citationFormat.test.ts`

**Interfaces:**
- Produces (used by Tasks 6, 8, 11, 12):

```ts
// types.ts
export type CitationStyle = 'mla9' | 'apa7';
export type SourceType = 'book' | 'journal' | 'website' | 'video';
export interface SourceAuthor { family: string; given: string }
export interface DocSource {
  id: string; type: SourceType; authors: SourceAuthor[];
  title: string; container?: string; publisher?: string; year?: string;
  volume?: string; issue?: string; pages?: string;
  url?: string; doi?: string; isbn?: string; accessed?: string;
}
export interface DocFootnote { id: string; text: string }
export interface PaperMeta { studentName?: string; instructor?: string; course?: string; date?: string }

// citationFormat.ts — every return is plain text except formatReference,
// which returns segments so italics survive into HTML and .docx:
export interface RefSegment { text: string; italic?: boolean }
export function formatInText(source: DocSource, style: CitationStyle, locator?: string): string
export function formatReference(source: DocSource, style: CitationStyle): RefSegment[]
export function buildWorksCited(sources: DocSource[], style: CitationStyle): { source: DocSource; segments: RefSegment[] }[]  // sorted
export function referenceSortKey(source: DocSource): string  // first author family, else title
```

- [ ] **Step 1: Write failing tests** covering every branch the formatters must handle:

```ts
import { describe, it, expect } from 'vitest';
import { formatInText, formatReference, buildWorksCited } from './citationFormat';
import type { DocSource } from './types';

const southern: DocSource = { id: '1', type: 'book',
  authors: [{ family: 'Southern', given: 'Eileen' }],
  title: 'The Music of Black Americans: A History',
  publisher: 'W. W. Norton', year: '1997' };

const journal: DocSource = { id: '2', type: 'journal',
  authors: [{ family: 'Burnim', given: 'Mellonee' }],
  title: 'The Black Gospel Music Tradition', container: 'Western Journal of Black Studies',
  volume: '9', issue: '2', year: '1985', pages: '106-111' };

const site: DocSource = { id: '3', type: 'website',
  authors: [], title: 'Spirituals', container: 'Library of Congress',
  year: '2021', url: 'https://www.loc.gov/spirituals', accessed: '2026-08-11' };

const flat = (segs: {text: string}[]) => segs.map(s => s.text).join('');

describe('MLA 9', () => {
  it('in-text with page', () => expect(formatInText(southern, 'mla9', '132')).toBe('(Southern 132)'));
  it('in-text without page', () => expect(formatInText(southern, 'mla9')).toBe('(Southern)'));
  it('no-author in-text falls back to short title', () =>
    expect(formatInText(site, 'mla9')).toBe('("Spirituals")'));
  it('book reference', () =>
    expect(flat(formatReference(southern, 'mla9')))
      .toBe('Southern, Eileen. The Music of Black Americans: A History. W. W. Norton, 1997.'));
  it('book title segment is italic', () =>
    expect(formatReference(southern, 'mla9').find(s => s.italic)?.text)
      .toBe('The Music of Black Americans: A History'));
  it('journal reference', () =>
    expect(flat(formatReference(journal, 'mla9')))
      .toBe('Burnim, Mellonee. "The Black Gospel Music Tradition." Western Journal of Black Studies, vol. 9, no. 2, 1985, pp. 106-111.'));
  it('website reference', () =>
    expect(flat(formatReference(site, 'mla9')))
      .toBe('"Spirituals." Library of Congress, 2021, https://www.loc.gov/spirituals. Accessed 11 Aug. 2026.'));
  it('two authors', () => {
    const two = { ...southern, authors: [{ family: 'A', given: 'X' }, { family: 'B', given: 'Y' }] };
    expect(formatInText(two, 'mla9', '3')).toBe('(A and B 3)');
    expect(flat(formatReference(two, 'mla9'))).toContain('A, X, and Y B.');
  });
  it('three+ authors use et al.', () => {
    const three = { ...southern, authors: [{ family: 'A', given: 'X' }, { family: 'B', given: 'Y' }, { family: 'C', given: 'Z' }] };
    expect(formatInText(three, 'mla9')).toBe('(A et al.)');
    expect(flat(formatReference(three, 'mla9'))).toContain('A, X, et al.');
  });
});

describe('APA 7', () => {
  it('in-text with page', () => expect(formatInText(southern, 'apa7', '132')).toBe('(Southern, 1997, p. 132)'));
  it('in-text without page', () => expect(formatInText(southern, 'apa7')).toBe('(Southern, 1997)'));
  it('book reference uses initials', () =>
    expect(flat(formatReference(southern, 'apa7')))
      .toBe('Southern, E. (1997). The Music of Black Americans: A History. W. W. Norton.'));
  it('two authors ampersand', () => {
    const two = { ...southern, authors: [{ family: 'A', given: 'Xa' }, { family: 'B', given: 'Yb' }] };
    expect(formatInText(two, 'apa7')).toBe('(A & B, 1997)');
  });
});

describe('buildWorksCited', () => {
  it('sorts by author family then title, no-author sorts by title', () => {
    const out = buildWorksCited([site, southern, journal], 'mla9');
    expect(out.map(o => o.source.id)).toEqual(['2', '1', '3']); // Burnim, Southern, "Spirituals"
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/documents/citationFormat.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `types.ts` and `citationFormat.ts`.** Guidance, not placeholders — the shape is mechanical:
  - `authorListMLA(authors)`: 1 → `Family, Given.`; 2 → `Family, Given, and Given Family.`; 3+ → `Family, Given, et al.`
  - `authorListAPA(authors)`: `Family, F.` initials from each word of `given`; join 2 with ` & `.
  - `formatInText`: MLA `(Family[ et al.][ locator])`; APA `(Family[ et al.]| & B, year[, p. locator])`; no author → quoted short title (first 4 words max, ellipsis-free).
  - `formatReference` builds `RefSegment[]`, marking italic: book title (book/video), container (journal/website). Website access date renders as `Accessed D Mon. YYYY.` from the ISO `accessed` string — write a tiny local `formatAccessed(iso)` (month abbreviations array; no date libs, no `new Date()` string parsing pitfalls: split the ISO on `-`).
  - Missing fields simply omit their clause (test the website case: no publisher, no pages).
  - Use the values as entered — no automatic title-casing or sentence-casing.

- [ ] **Step 4: Run to green** — same command, all pass.

- [ ] **Step 5: Commit** — `git commit -m "feat(documents): MLA9/APA7 citation formatters"`

---

### Task 3: DOI / ISBN auto-fill + CSP hosts

**Files:**
- Create: `src/lib/documents/sourceLookup.ts`
- Test: `src/lib/documents/sourceLookup.test.ts`
- Modify: `index.html` (line ~25, CSP meta tag `connect-src` list)

**Interfaces:**
- Consumes: `DocSource`, `SourceType` from Task 2.
- Produces (used by Task 8): `export async function lookupDOI(doi: string): Promise<Partial<DocSource> | null>` and `export async function lookupISBN(isbn: string): Promise<Partial<DocSource> | null>` — both return `null` on any failure (never throw).

- [ ] **Step 1: Write failing tests** with `vi.stubGlobal('fetch', …)`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { lookupDOI, lookupISBN } from './sourceLookup';

afterEach(() => vi.unstubAllGlobals());

it('maps a Crossref work to DocSource fields', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: {
    title: ['A Study of Spirituals'], 'container-title': ['Journal of Musicology'],
    author: [{ family: 'Jones', given: 'Arthur' }],
    issued: { 'date-parts': [[1993]] }, volume: '11', issue: '2', page: '123-145', DOI: '10.1/abc',
  }})}));
  const r = await lookupDOI('10.1/abc');
  expect(r).toMatchObject({ type: 'journal', title: 'A Study of Spirituals',
    container: 'Journal of Musicology', year: '1993', volume: '11', pages: '123-145',
    authors: [{ family: 'Jones', given: 'Arthur' }] });
});

it('returns null on non-ok response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  expect(await lookupDOI('nope')).toBeNull();
});

it('returns null on network error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
  expect(await lookupISBN('9780393038439')).toBeNull();
});

it('maps Open Library book data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    'ISBN:9780393038439': { title: 'The Music of Black Americans',
      authors: [{ name: 'Eileen Southern' }], publish_date: '1997',
      publishers: [{ name: 'W. W. Norton' }] },
  })}));
  const r = await lookupISBN('9780393038439');
  expect(r).toMatchObject({ type: 'book', title: 'The Music of Black Americans',
    publisher: 'W. W. Norton', year: '1997',
    authors: [{ family: 'Southern', given: 'Eileen' }] });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Endpoints: `https://api.crossref.org/works/{encodeURIComponent(doi)}` and `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`. Open Library author names split on last space → `{given, family}`. `publish_date` → last 4-digit-year regex match. Crossref `type` mapping: anything containing `journal` → `'journal'`, `book`/`monograph` → `'book'`, else `'website'`. Wrap the whole body in try/catch → `null`.

- [ ] **Step 4: Run to green.**

- [ ] **Step 5: Add CSP hosts** — in `index.html`'s CSP meta tag, append to the `connect-src` list (nowhere else): `https://api.crossref.org https://openlibrary.org`.

- [ ] **Step 6: Commit** — `git commit -m "feat(documents): DOI/ISBN source auto-fill + CSP hosts"`

---

### Task 4: Data layer — `personalDocsApi`

**Files:**
- Create: `src/lib/documents/personalDocsApi.ts`
- Test: `src/lib/documents/personalDocsApi.test.ts`

**Interfaces:**
- Consumes: `DocSource, DocFootnote, PaperMeta, CitationStyle` (Task 2), supabase client.
- Produces (used by Tasks 9, 10):

```ts
export interface PersonalDoc {
  id: string; user_id: string; title: string; content: unknown /* TipTap JSON */;
  citation_style: CitationStyle; sources: DocSource[]; footnotes: DocFootnote[];
  paper_meta: PaperMeta; word_count: number; created_at: string; updated_at: string;
}
export interface PersonalDocListItem { id: string; title: string; word_count: number; updated_at: string }
export async function listDocs(): Promise<PersonalDocListItem[]>
export async function createDoc(userId: string): Promise<PersonalDoc>       // inserts defaults, returns row
export async function getDoc(id: string): Promise<PersonalDoc>
export async function saveDoc(id: string, patch: Partial<Pick<PersonalDoc,'title'|'content'|'citation_style'|'sources'|'footnotes'|'paper_meta'|'word_count'>>): Promise<void>
export async function deleteDoc(id: string): Promise<void>
export function assertRowReturned<T>(rows: T[] | null, action: string): T   // throws if empty/null
```

- [ ] **Step 1: Write failing test for the guard** (the only pure part — the rest is a thin supabase pass-through, not worth mocking the client for):

```ts
import { describe, it, expect } from 'vitest';
import { assertRowReturned } from './personalDocsApi';

it('returns the first row when present', () =>
  expect(assertRowReturned([{ id: 'a' }], 'save')).toEqual({ id: 'a' }));
it('throws on empty array (silent RLS failure)', () =>
  expect(() => assertRowReturned([], 'save')).toThrow(/save/));
it('throws on null', () =>
  expect(() => assertRowReturned(null, 'load')).toThrow(/load/));
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Every mutating call is `supabase.from('gw_personal_docs')…{insert|update|delete}(…).select()` and passes the result through `assertRowReturned(data, '<action>')` (delete included — a delete that matched no row is a failure). `saveDoc` always sets `updated_at: new Date().toISOString()`. The table is not in the generated types: use `supabase.from('gw_personal_docs' as never)` … cast results through `as unknown as PersonalDoc` inside this module only — no casts leak to callers. `listDocs` selects `id,title,word_count,updated_at` ordered `updated_at desc`.

- [ ] **Step 4: Run to green.**

- [ ] **Step 5: Commit** — `git commit -m "feat(documents): personalDocsApi data layer"`

---

### Task 5: TipTap extension install + `DocumentEditor` shell

**Files:**
- Modify: `package.json` (new deps)
- Create: `src/components/documents/DocumentEditor.tsx`
- Create: `src/components/documents/DocToolbar.tsx`

**Interfaces:**
- Consumes: TipTap 3 packages.
- Produces (used by Tasks 6–9): 

```tsx
export interface DocumentEditorProps {
  content: unknown;                      // TipTap JSON
  onUpdate: (json: unknown, wordCount: number) => void;
  citationChipText: (sourceId: string, locator?: string) => string; // Task 6 wires this
  onCiteClick: () => void; onFootnoteClick: () => void;             // toolbar buttons
  editorRef?: (editor: Editor | null) => void;                      // parent needs commands
}
export function DocumentEditor(props: DocumentEditorProps): JSX.Element
```

- [ ] **Step 1: Install extensions** (pin the same 3.26.x minor as the installed TipTap packages; `@tiptap/extensions` at its matching 3.x):

```bash
npm install --legacy-peer-deps @tiptap/extension-table@^3.26.1 @tiptap/extension-text-align@^3.26.1 @tiptap/extension-subscript@^3.26.1 @tiptap/extension-superscript@^3.26.1 @tiptap/extension-highlight@^3.26.1 @tiptap/extensions@^3.26.1
```

Then verify the v3 import surface before writing code (`CharacterCount` lives in `@tiptap/extensions` in v3; `Table, TableRow, TableHeader, TableCell` are all exported from `@tiptap/extension-table`): `node -e "const t=require('@tiptap/extension-table'); const x=require('@tiptap/extensions'); console.log(!!t.Table, !!t.TableRow, !!x.CharacterCount)"`. If an import differs, adapt to what the package actually exports — do not downgrade.

- [ ] **Step 2: Build `DocumentEditor`.** Follow `src/components/editor/RichTextEditor.tsx` (read it first) for the `useEditor`/`ToolbarButton` idiom, but this is a page-scale component:
  - Extensions: `StarterKit`, `Underline`, `Link` (same config as RichTextEditor), `Image`, `Table.configure({ resizable: false })`, `TableRow`, `TableHeader`, `TableCell`, `TextAlign.configure({ types: ['heading','paragraph'] })`, `Subscript`, `Superscript`, `Highlight`, `CharacterCount`, plus (Tasks 6–7) `CitationChip`, `FootnoteRef`.
  - `onUpdate: ({ editor }) => props.onUpdate(editor.getJSON(), countWords(editor.getText()))` where `countWords = (t: string) => (t.trim().match(/\S+/g) ?? []).length` (defined and exported here; CharacterCount's word counter is used for the live footer display, `countWords` is what we persist — same algorithm keeps them consistent, assert in a 3-line unit test inside Task 9's test file).
  - Surface: `mx-auto max-w-[700px] px-6 py-10 bg-card rounded-xl` with `prose`-like styles scoped via the editor's `editorProps.attributes.class` — serif body: `font-serif text-[17px] leading-relaxed text-foreground`.
  - `DocToolbar` (own file): sticky `top-0 z-10 bg-background/95 backdrop-blur border-b border-border`, groups exactly: undo/redo · block-style `<select>` (Paragraph/H1/H2/H3, `text-sm`) · bold/italic/underline/highlight · align left/center/right · bullet/ordered list · blockquote · table insert (3×3) · image (Task 9 wires upload; disabled until then) · footnote (calls `onFootnoteClick`) · link · **Cite** button (calls `onCiteClick`) — `ToolbarButton` copies RichTextEditor's pattern (`w-4 h-4` icons, `onMouseDown` preventDefault).

- [ ] **Step 3: Verify it compiles and renders** — `npx tsc --noEmit -p tsconfig.json` (note: run from repo root, real project — the sight-singing/ no-op trap doesn't apply here) and `npx vite build --mode development 2>&1 | tail -5` must succeed. (No route yet; page smoke test comes in Task 9.)

- [ ] **Step 4: Commit** — `git commit -m "feat(documents): DocumentEditor shell on TipTap 3"`

---

### Task 6: `citationChip` atomic node + style switching

**Files:**
- Create: `src/components/documents/extensions/CitationChip.ts`
- Test: `src/components/documents/extensions/citationChip.test.ts`

**Interfaces:**
- Consumes: `formatInText` (Task 2).
- Produces (used by Tasks 8, 9, 11, 12):

```ts
// Extension options let the node render without knowing about React state:
export interface CitationChipOptions { getText: (sourceId: string, locator?: string) => string }
export const CitationChip: Node<CitationChipOptions>  // name 'citationChip', attrs { sourceId: string, locator: string | null }
// Commands: editor.commands.insertCitation({ sourceId, locator }) 
// Helper: collectCitedSourceIds(docJson: unknown): Set<string>   // exported from same file
// Helper: removeCitationsFor(editor: Editor, sourceId: string): void
```

- [ ] **Step 1: Write failing tests** for the pure helpers (node behavior itself is exercised via Task 9's smoke test and manual QA — headless TipTap render tests are brittle; the helpers carry the correctness weight):

```ts
import { describe, it, expect } from 'vitest';
import { collectCitedSourceIds } from './CitationChip';

const doc = { type: 'doc', content: [
  { type: 'paragraph', content: [
    { type: 'text', text: 'Spirituals carried coded meaning ' },
    { type: 'citationChip', attrs: { sourceId: 's1', locator: '132' } },
  ]},
  { type: 'paragraph', content: [
    { type: 'citationChip', attrs: { sourceId: 's2', locator: null } },
  ]},
]};

it('collects cited source ids recursively', () =>
  expect([...collectCitedSourceIds(doc)].sort()).toEqual(['s1', 's2']));
it('empty doc yields empty set', () =>
  expect(collectCitedSourceIds({ type: 'doc', content: [] }).size).toBe(0));
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement the node.** `Node.create<CitationChipOptions>` with: `name: 'citationChip'`, `group: 'inline'`, `inline: true`, `atom: true`, `addAttributes` for `sourceId`/`locator`, `parseHTML`/`renderHTML` using `span[data-citation-chip]` with `data-source-id`/`data-locator` attrs, and rendered text from `this.options.getText(...)` (chip styling: `class: 'rounded bg-muted px-0.5'` in renderHTML — keeps it visibly atomic without loud color). `addCommands` → `insertCitation` inserts the node at selection. `collectCitedSourceIds` walks `content` arrays recursively. `removeCitationsFor` iterates `editor.state.doc.descendants`, collects positions of matching chips, deletes them in one chained transaction from the end backwards.
  Style/label refresh (style switch or source edit): the chip's text is produced at render; the parent (Task 9) forces re-render by dispatching an empty transaction after `sources`/`citation_style` change: `editor.view.dispatch(editor.state.tr)` — note this in a comment in the extension file.

- [ ] **Step 4: Run to green.**

- [ ] **Step 5: Commit** — `git commit -m "feat(documents): citationChip atomic node"`

---

### Task 7: In-house footnotes (`footnoteRef` node + numbering)

**Files:**
- Create: `src/components/documents/extensions/FootnoteRef.ts`
- Test: `src/components/documents/extensions/footnoteRef.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 9, 11, 12):

```ts
export const FootnoteRef: Node // name 'footnoteRef', attrs { noteId: string }, atomic inline, renders superscript number
export function orderedFootnoteIds(docJson: unknown): string[]  // document order → numbering
// Command: editor.commands.insertFootnoteRef({ noteId })
```

Design (settles the spec's "vet community extension, fallback in-house" contingency — we go in-house directly; the v3-compatible community option doesn't exist, and plain-text notes are all v1 needs): the marker in the text is an atomic `footnoteRef` carrying a `noteId`; the note TEXT lives in the doc row's `footnotes: DocFootnote[]` column (Task 1), edited in a plain textarea popover (Task 9). Numbering is derived: position in `orderedFootnoteIds` + 1. Export renders real .docx footnotes (Task 11); the PDF preview renders them as endnotes titled "Notes" (MLA-sanctioned).

- [ ] **Step 1: Write failing tests:**

```ts
import { it, expect } from 'vitest';
import { orderedFootnoteIds } from './FootnoteRef';

const doc = { type: 'doc', content: [
  { type: 'paragraph', content: [
    { type: 'text', text: 'a' }, { type: 'footnoteRef', attrs: { noteId: 'n2' } },
    { type: 'text', text: 'b' }, { type: 'footnoteRef', attrs: { noteId: 'n1' } },
  ]},
]};
it('orders by document position, not id', () =>
  expect(orderedFootnoteIds(doc)).toEqual(['n2', 'n1']));
it('handles doc with none', () =>
  expect(orderedFootnoteIds({ type: 'doc', content: [] })).toEqual([]));
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement** — same atomic-inline-node shape as Task 6 (`span[data-footnote-ref]`, `data-note-id`). Rendering: the superscript index. The node needs the number at render time: give the extension an option `getIndex: (noteId: string) => number` (parent supplies it from `orderedFootnoteIds` of current JSON — recomputed in the same `onUpdate` that autosaves). `renderHTML` emits `['sup', …, String(getIndex(noteId) + 1)]`… TipTap `renderHTML` is static per-schema; like Task 6, numbering refresh rides the empty-transaction re-render. Orphan hygiene both directions: deleting a ref leaves `footnotes[]` text orphaned → Task 9 prunes orphaned note text on save; a `footnoteRef` whose `noteId` has no entry renders as `[?]`.

- [ ] **Step 4: Run to green.**

- [ ] **Step 5: Commit** — `git commit -m "feat(documents): in-house footnoteRef node"`

---

### Task 8: `SourcesPanel` (add/edit sources, auto-fill, cite)

**Files:**
- Create: `src/components/documents/SourcesPanel.tsx`
- Create: `src/components/documents/SourceForm.tsx`
- Create: `src/components/documents/WorksCitedPreview.tsx`

**Interfaces:**
- Consumes: `DocSource`, `buildWorksCited`, `formatReference` (Task 2); `lookupDOI/lookupISBN` (Task 3).
- Produces (used by Task 9):

```tsx
export function SourcesPanel(props: {
  sources: DocSource[]; style: CitationStyle;
  onChange: (next: DocSource[]) => void;
  onCite: (sourceId: string, locator?: string) => void;
  onDeleteSource: (sourceId: string) => void;   // parent handles chip removal + confirm
}): JSX.Element
export function WorksCitedPreview(props: { sources: DocSource[]; style: CitationStyle }): JSX.Element
```

- [ ] **Step 1: Build `SourceForm`** — type picker (`book | journal | website | video`, labeled Book / Journal article / Website / Video) then fields per type (authors as repeatable given/family pairs with add/remove; journal shows container="Journal", volume/issue/pages; website shows container="Website name", url, accessed defaulting to today via the browser only at click time; video shows container="Channel/Platform", url). Top of form: one "Auto-fill" input + button — if the value matches `/^10\.\d{4,}/` call `lookupDOI`, else if digits-only 10/13 chars call `lookupISBN`, else disable the button with caption "Enter a DOI or ISBN". Null result → small inline "No match — fill in below" caption, never a blocker. Successful lookup merges into the form fields (user can still edit everything). ids: `crypto.randomUUID()`.
- [ ] **Step 2: Build `SourcesPanel`** — desktop: right column `w-72 shrink-0` card list; mobile: bottom sheet triggered from toolbar Cite (Task 9 owns which container shows). Each source row: formatted short label (family + year), edit (reopens `SourceForm`), **Cite** (expands an inline `locator` input + confirm, calls `onCite`), delete (calls `onDeleteSource`). Empty state copy: "No sources yet. Add a book, article, website, or video — students cite as they write."
- [ ] **Step 3: Build `WorksCitedPreview`** — heading "Works Cited" (MLA) / "References" (APA), entries from `buildWorksCited`, each rendered `pl-8 -indent-8` (hanging indent), italic segments in `<i>`. Renders `null` when no sources.
- [ ] **Step 4: Compile check** — `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat(documents): sources panel, source form, works cited preview"`

---

### Task 9: `DocumentEditorPage` — autosave, unsavedWork, footnote popover, images

**Files:**
- Create: `src/pages/documents/DocumentEditorPage.tsx`
- Create: `src/pages/documents/useDocAutosave.ts`
- Test: `src/pages/documents/useDocAutosave.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–8; `retainUnsavedWork` from `@/lib/unsavedWork` (returns an idempotent release fn; holders counted, label debug-only); `supabase.auth.getUser()`.
- Produces: the working editor page at `/dashboard/documents/:id` (route registered in Task 10).

- [ ] **Step 1: Write failing tests for the autosave hook** (fake timers):

```ts
import { describe, it, expect, vi } from 'vitest';
import { createAutosaver } from './useDocAutosave';

it('debounces: one save for rapid edits', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(undefined);
  const a = createAutosaver(save, 2000);
  a.schedule({ title: 'x' }); a.schedule({ title: 'xy' }); a.schedule({ title: 'xyz' });
  await vi.advanceTimersByTimeAsync(2100);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({ title: 'xyz' });
  vi.useRealTimers();
});

it('retries with backoff on failure and reports status', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue(undefined);
  const statuses: string[] = [];
  const a = createAutosaver(save, 2000, s => statuses.push(s));
  a.schedule({ title: 'x' });
  await vi.advanceTimersByTimeAsync(2100);   // first attempt fails
  await vi.advanceTimersByTimeAsync(4100);   // backoff retry succeeds
  expect(save).toHaveBeenCalledTimes(2);
  expect(statuses).toEqual(['saving', 'error', 'saving', 'saved']);
  vi.useRealTimers();
});

it('flush() saves pending work immediately', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(undefined);
  const a = createAutosaver(save, 2000);
  a.schedule({ title: 'x' });
  await a.flush();
  expect(save).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement `createAutosaver`** (pure factory, exported for tests; `useDocAutosave` is a thin React wrapper): pending-patch merge on `schedule`, single timer, statuses `'saving'|'saved'|'error'` via optional callback, backoff `4s → 8s → 16s` capped, `flush()` for blur/unmount. The React wrapper: `retainUnsavedWork('personal-doc')` while status is not `'saved'` or a patch is pending; release when clean (release is idempotent — safe to call repeatedly).

- [ ] **Step 4: Run to green.**

- [ ] **Step 5: Build the page.** Composition:
  - Load via `getDoc(id)`; loading skeleton; load failure → error card with Retry button — never mount an empty editor over an unloaded doc (an autosave from that state would wipe content).
  - Inline title input (`text-2xl font-semibold bg-transparent`), MLA/APA toggle (two-segment control), save-status caption, Export button (Task 12).
  - `DocumentEditor` with `onUpdate={(json, wc) => { pruneAndSchedule(json, wc); }}` — `pruneAndSchedule` recomputes `orderedFootnoteIds`, drops orphaned entries from `footnotes`, and `autosaver.schedule({ content: json, word_count: wc, footnotes: pruned })`. Style toggle and source edits also `schedule` + dispatch the empty re-render transaction (Tasks 6/7 comment).
  - `citationChipText={(sid, loc) => { const s = sources.find(x => x.id === sid); return s ? formatInText(s, style, loc ?? undefined) : '[missing source]'; }}`
  - Footnote flow: toolbar button → `noteId = crypto.randomUUID()`, `insertFootnoteRef`, open popover (small `Textarea` anchored bottom of editor, `text-sm`) writing into `footnotes`; clicking an existing marker reopens it (DOM click handler on `[data-footnote-ref]` via editor `handleClickOn`).
  - Delete source flow: confirm dialog "Remove this source and its N citations?" → `removeCitationsFor(editor, id)` then drop from `sources`.
  - Image upload: hidden file input; upload to bucket path `personal-docs/${userId}/${docId}/${crypto.randomUUID()}.{ext}` via the existing storage upload pattern — find it with `grep -rn "storage.from(" src/lib | head` and reuse the proxy-served URL helper the Studio/PartTrack code uses; on failure toast and insert nothing. **Storage policy note:** the bucket write path must be covered by an owner-scoped storage policy — add to the Task 1 migration if missing: policy on `storage.objects` for the bucket restricting to `(storage.foldername(name))[1] = 'personal-docs' AND (storage.foldername(name))[2] = auth.uid()::text` for ALL verbs (verify exact folder convention against an existing owner-scoped storage policy in migrations first; do NOT copy the broad `authenticated SELECT` pattern — it is a known cross-tenant hole).
  - Below editor: `WorksCitedPreview`; right column (desktop `lg:flex` row) / sheet (mobile): `SourcesPanel`.
  - Word-count consistency assertion goes in this task's test file: `countWords('  two  words ') === 2`, `countWords('') === 0` (import from Task 5).
- [ ] **Step 6: Compile + full test pass** — `npx tsc --noEmit && npx vitest run src/lib/documents src/pages/documents src/components/documents`.
- [ ] **Step 7: Commit** — `git commit -m "feat(documents): editor page with autosave, footnotes, images"`

---

### Task 10: Library page, routes, nav catalog entry

**Files:**
- Create: `src/pages/documents/DocumentsLibrary.tsx`
- Modify: `src/App.tsx` (lazy import + two routes, next to the planner routes ~line 1780)
- Modify: `src/lib/navigation/navCatalog.ts` (one entry)

**Interfaces:**
- Consumes: `listDocs/createDoc/deleteDoc` (Task 4).
- Produces: user-reachable feature.

- [ ] **Step 1: Build `DocumentsLibrary`** — `DashboardPageShell`-style page (copy the wrapper used by a comparable personal page — read how `/dashboard/music-library` or the planner page mounts inside the shell and mirror it): header "Documents" + "New document" button (`createDoc(user.id)` → navigate to `/dashboard/documents/${id}`), list rows: title, `word_count.toLocaleString()` words, relative updated time (reuse the codebase's existing relative-time helper — find with `grep -rn "formatDistance\|timeAgo" src/lib src/components | head`), kebab → Delete with confirm dialog ("Delete this document? This can't be undone."). Empty state: "Write essays, program notes, and research papers — without leaving GleeWorld."
- [ ] **Step 2: Register routes in `App.tsx`** — lazy `DocumentsLibrary` + `DocumentEditorPage`; paths `/dashboard/documents` and `/dashboard/documents/:id`, wrapped in the same auth/layout wrappers as the adjacent `/dashboard/*` personal routes (mirror exactly what `/dashboard/music-library` uses — NO `ModuleGate`: personal docs are not a tenant add-on module).
- [ ] **Step 3: Add nav catalog entry** in `src/lib/navigation/navCatalog.ts`, `today` section, after the `notes` entry:

```ts
{ key: 'documents', to: '/dashboard/documents', label: 'Documents', icon: FileText, section: 'today', tone: 'bg-blue-50 text-blue-600', tourId: 'nav-documents' },
```

(no `gate` — available to everyone; My World tools have no cap, 8 is a seed not a ceiling.)
- [ ] **Step 4: Smoke-test route wiring** — add to the existing pattern in `src/__tests__/` a small render test if the neighbors have one for route redirects; otherwise verify by `npx vite build` + run the dev server (`npm run dev`) and click through: library → new doc → type → reload (expect beforeunload prompt while saving) → reopen → content intact.
- [ ] **Step 5: Full test suite** — `npx vitest run` (all green, including pre-existing tests — NavShelf/myWorldRedirect tests must not break from the catalog entry).
- [ ] **Step 6: Commit** — `git commit -m "feat(documents): library page, routes, My World nav entry"`

---

### Task 11: `.docx` export

**Files:**
- Modify: `package.json` (add `docx`)
- Create: `src/lib/documents/docxExport.ts`
- Test: `src/lib/documents/docxExport.test.ts`

**Interfaces:**
- Consumes: `DocSource, DocFootnote, PaperMeta, CitationStyle, formatInText, buildWorksCited, orderedFootnoteIds`.
- Produces (used by Task 12):

```ts
export interface ExportInput {
  content: unknown; title: string; style: CitationStyle;
  sources: DocSource[]; footnotes: DocFootnote[]; meta: PaperMeta;
}
export function buildDocxModel(input: ExportInput): { doc: Document /* from 'docx' */ }
export async function exportDocx(input: ExportInput): Promise<Blob>
export function exportFilename(title: string, ext: 'docx' | 'pdf'): string  // slugified
// internal but exported for tests:
export function tiptapToDocxParagraphs(content: unknown, ctx: ConverterCtx): Paragraph[]
```

- [ ] **Step 1: Install** — `npm install --legacy-peer-deps docx` (v9.x, pure-JS, browser-safe via Packer.toBlob).
- [ ] **Step 2: Write failing tests** (structural — assert on the docx object model, never unzip):

```ts
import { describe, it, expect } from 'vitest';
import { buildDocxModel, exportFilename, tiptapToDocxParagraphs } from './docxExport';

const base = { title: 'Spirituals', style: 'mla9' as const, sources: [], footnotes: [], meta: { studentName: 'A Student' } };

it('slugifies filenames', () =>
  expect(exportFilename('The Spirituals: of Eileen Southern!', 'docx'))
    .toBe('The-Spirituals-of-Eileen-Southern.docx'));

it('converts paragraphs with bold/italic runs', () => {
  const paras = tiptapToDocxParagraphs({ type: 'doc', content: [
    { type: 'paragraph', content: [
      { type: 'text', text: 'plain ' },
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
    ]},
  ]}, testCtx());
  expect(paras).toHaveLength(1);
  // docx exposes options on the instances; assert the second run is bold
});

it('renders citation chips as formatted in-text citations', () => {
  const ctx = testCtx({ sources: [{ id: 's1', type: 'book', authors: [{ family: 'Southern', given: 'E' }], title: 'T', year: '1997' }], style: 'mla9' });
  const paras = tiptapToDocxParagraphs({ type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'citationChip', attrs: { sourceId: 's1', locator: '12' } }]},
  ]}, ctx);
  // the run text should be '(Southern 12)'
});

it('model has works cited section when sources exist', () => { /* buildDocxModel(...) — last section heading 'Works Cited' */ });
it('model has footnotes when refs exist', () => { /* footnotes option keyed 1..n in document order */ });
```

Write `testCtx()` in the test file as a small factory for `ConverterCtx` (define `ConverterCtx` in the module: `{ style, sources, footnotes, footnoteIndex: (noteId) => number }`). Flesh the commented assertions into real ones while implementing — the `docx` object model exposes what you construct; where an option is not readable back, restructure so the converter returns your own intermediate run descriptors (`{ text, bold, italic, footnoteId? }[]` per paragraph) and a thin final mapping to `docx` classes — then assert on the intermediates. **Prefer that intermediate-representation design from the start**: `tiptapToRuns(content, ctx) → ParaModel[]` (fully testable, no docx imports) + `paraModelsToDocx(models)` (thin, untested beyond compile).
- [ ] **Step 3: Run to verify failure.**
- [ ] **Step 4: Implement.** Node coverage: paragraph, heading 1–3, bulletList/orderedList (flatten to paragraphs with docx numbering/bullet refs), blockquote (indented paragraph), table (docx Table), image (skip in v1 export if fetching the binary fails — never abort the whole export; fetch via the same proxy URL used in-app, embed with `ImageRun`), citationChip → text run from `formatInText`, footnoteRef → `FootnoteReferenceRun` with docx `footnotes: { [n]: { children: [Paragraph(text)] } }` keyed by document order. Paper format: section properties 1″ margins (`1440` twips); default run font `Times New Roman` size `24` half-points; paragraph spacing `{ line: 480 }` (double), first-line indent `720` twips for body paragraphs; header — MLA: right-aligned `LastName ` + `PageNumber.CURRENT` (last word of `meta.studentName`), APA: page number only; MLA heading block (name/instructor/course/date lines, then centered title); APA: separate title page section. Works Cited/References: new page (`pageBreakBefore`), centered heading, entries with hanging indent (`indent: { left: 720, hanging: 720 }`), italics from `RefSegment.italic`.
- [ ] **Step 5: Run to green;** also `npx tsc --noEmit`.
- [ ] **Step 6: Commit** — `git commit -m "feat(documents): docx export with MLA/APA formatting"`

---

### Task 12: `ExportDialog` + PDF print view

**Files:**
- Create: `src/components/documents/ExportDialog.tsx`
- Create: `src/components/documents/PrintPaperView.tsx`
- Create: `src/styles/print-paper.css` (imported by PrintPaperView only)
- Modify: `src/pages/documents/DocumentEditorPage.tsx` (wire Export button)

**Interfaces:**
- Consumes: `exportDocx, exportFilename, ExportInput` (Task 11); `formatInText, buildWorksCited, orderedFootnoteIds`; `PaperMeta`.
- Produces: user-facing export.

- [ ] **Step 1: Build `ExportDialog`** — opens from the page's Export button. Fields (prefilled from `paper_meta`, saved back via `saveDoc` on change — flush before exporting): Student name, Instructor, Course, Date (plain text input; default empty — no auto-today, the student may be post-dating). Buttons: "Download .docx" → `await autosaver.flush(); const blob = await exportDocx(input); trigger download via URL.createObjectURL + <a download={exportFilename(title,'docx')}>` ; "Print / Save as PDF" → open print view (Step 2). Failure of either: toast with the error, dialog stays open.
- [ ] **Step 2: Build `PrintPaperView`** — a full-screen overlay (not a route — avoids loading the doc twice) rendering the paper as formatted HTML: MLA heading block or APA title page from `paper_meta`, body from TipTap JSON via `generateHTML` (import from `@tiptap/core` with the SAME extension array the editor uses — export a `documentExtensions(opts)` factory from `DocumentEditor.tsx` in this step and reuse it in both places; citation chips/footnote refs render through the same `getText`/`getIndex` options), endnotes section titled "Notes", then Works Cited. `print-paper.css`: `@page { margin: 1in }`, `font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 2;`, `p { text-indent: 0.5in; margin: 0 }`, hanging indents for entries, `@media print { .no-print { display: none } }` hiding the overlay chrome (Close + Print buttons). Print button calls `window.print()`.
- [ ] **Step 3: Wire into the page**, compile, and run the dev server: export a .docx and open it (Word or Pages) — verify double-spacing, header, heading block, footnote, works cited hanging indent. Print preview → check page margins and that toolbar/panel are hidden.
- [ ] **Step 4: Full suite** — `npx vitest run` all green; `npx vite build` succeeds.
- [ ] **Step 5: Commit** — `git commit -m "feat(documents): export dialog, docx download, print-to-PDF view"`

---

### Task 13: Final verification + PR

**Files:** none new.

- [ ] **Step 1: Full checks** — `npx tsc --noEmit && npx vitest run && npx vite build` (all clean).
- [ ] **Step 2: Manual QA checklist** (dev server, desktop + narrow viewport):
  - New doc → write 3 paragraphs with headings, bold/italic, a bullet list, a blockquote, a 2×2 table.
  - Add a book source by hand + one via ISBN auto-fill (offline case: kill network, confirm the manual-form fallback caption).
  - Insert 2 in-text citations with page numbers; switch MLA↔APA — chips AND works cited reformat.
  - Insert 2 footnotes; delete the first marker — numbering renumbers, orphaned text pruned after save.
  - Delete a cited source — confirm dialog, chips removed.
  - Reload mid-typing — browser leave-prompt appears; after "Saved", no prompt.
  - Export .docx (open it), print preview → PDF.
  - Narrow viewport: toolbar wraps, sources open as sheet, no horizontal scroll, no swipe-page behavior.
- [ ] **Step 3: Update the spec** if any implementation decision diverged (footnotes column, WorksCited as React block — already reflected; add anything new).
- [ ] **Step 4: Push branch + PR** — `git push -u origin docs/word-processor-spec` then `gh pr create` titled `feat: Documents — in-app word processor (My World)`, body summarizing: new table + RLS, editor, citations, export; note the migration file for the deploy checklist and the two new CSP hosts; end with the Claude Code generation line. **Do not merge or deploy** — Kevin reviews; deploy is via `scripts/deploy-frontend.sh` + migration as `supabase_admin`, and post-deploy `CACHE_VERSION` must match main tip.

---

## Self-review notes (already applied)

- Spec's `worksCited` TipTap node simplified to a read-only React block (`WorksCitedPreview`) — derived content needs no editor node; export composes it independently. Spec updated in Task 13 if any further drift.
- Spec's community-footnotes option resolved to in-house (`footnoteRef` + `footnotes jsonb` column added in Task 1) — no v3-compatible community extension to vet.
- Type names used across tasks checked: `DocSource/DocFootnote/PaperMeta/CitationStyle/RefSegment` (Task 2) are the only shared vocabulary; `ExportInput` (Task 11) consumed by Task 12; `createAutosaver` signature consistent between Tasks 9's tests and implementation.
