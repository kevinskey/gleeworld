# Documents: In-App Word Processor — Design

**Date:** 2026-08-11
**Status:** Approved (brainstorm with Kevin, 2026-08-11)
**Goal:** A student can write a complete research paper — footnotes, citations, works cited, proper export — without leaving GleeWorld.

## Decisions made during brainstorm

- **Home:** personal doc library in My World. Owner-private. Academy assignment integration is a later phase.
- **Fidelity:** flowing "pageless" editor while writing; true paper formatting (MLA 9 / APA 7 page rules) is applied at export. No simulated page view while typing.
- **Citations:** first-class citation manager with auto-formatted in-text citations and a generated Works Cited / References section. This is the differentiator over "just use Google Docs."
- **Sharing:** none in v1. Private + export only. Real-time collaboration explicitly out of scope.
- **Google:** no Google Docs/Drive integration. `.docx` opens in Google Docs anyway.
- **Editor tech:** build on TipTap 3 (already shipped, v3.26) — Approach A over commercial editors (Syncfusion/CKEditor) and self-hosted OnlyOffice, which were rejected for cost, bundle weight, design-system mismatch, and droplet load.

## Architecture

Frontend feature plus one migration. No new services, no new edge functions.

- **Nav:** "Documents" entry in My World nav.
- **Routes:** `/dashboard/documents` (library list: title, word count, last edited, new/delete) and `/dashboard/documents/:id` (editor page).
- **Components:**
  - `DocumentsLibrary` — list page.
  - `DocumentEditorPage` — loads the doc, owns autosave, renders the pieces below.
  - `DocumentEditor` — the TipTap surface + toolbar. **Separate component from `src/components/editor/RichTextEditor.tsx`**, which stays untouched for module resources and Planner notes.
  - `SourcesPanel` — citation manager (right panel on desktop, sheet on mobile).
  - `ExportDialog` — heading-block fields + .docx / PDF actions.
- **New library code:**
  - `src/lib/documents/citationFormat.ts` — MLA 9 / APA 7 formatters.
  - `src/lib/documents/docxExport.ts` — TipTap JSON → .docx.
  - `src/lib/documents/sourceLookup.ts` — DOI (Crossref) + ISBN (Open Library) auto-fill.

## Data model

One table, `gw_personal_docs`, mirroring `gw_personal_scores` (migration `20260712120000_personal_music_library.sql`):

- **No `tenant_id` — deliberate.** Personal docs follow the person across tenants, same documented exception as `gw_personal_scores`. Carry the same explanatory comment for multi-tenant RLS audits.
- Columns:
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `title text not null default 'Untitled'`
  - `content jsonb not null` — TipTap document JSON. Single source of truth; HTML preview, .docx, and PDF are all derived from it.
  - `citation_style text not null default 'mla9' check (citation_style in ('mla9','apa7'))`
  - `sources jsonb not null default '[]'` — array of structured sources (see below). Doc-scoped, not a shared library: a join table is YAGNI for v1.
  - `footnotes jsonb not null default '[]'` — array of `{ id, text }`; footnote text lives beside the doc JSON (markers in the content reference it by id). Plan-time addition.
  - `paper_meta jsonb not null default '{}'` — heading block: student name, instructor, course, date. Collected on first export, persisted for re-export.
  - `word_count int not null default 0` — denormalized for the library list.
  - `created_at` / `updated_at timestamptz not null default now()`
- RLS: enable + owner-only policies on all four verbs (`auth.uid() = user_id`), exactly the `gw_personal_scores` pattern.
- Index: `(user_id, updated_at desc)`.

### Source object shape (inside `sources jsonb`)

```json
{
  "id": "uuid",
  "type": "book | journal | website | video",
  "authors": [{ "family": "Southern", "given": "Eileen" }],
  "title": "The Music of Black Americans",
  "container": "",            // journal name / website name / channel
  "publisher": "W. W. Norton",
  "year": "1997",
  "volume": "", "issue": "", "pages": "",
  "url": "", "doi": "", "isbn": "",
  "accessed": ""              // websites
}
```

Four types cover student papers. Adding a type later = one formatter case + one form variant.

## Editor

Built on installed TipTap 3 extensions plus new free ones:

- Already installed: StarterKit, Link, Underline, Image, List, TextStyle.
- Add: `@tiptap/extension-table` (+ row/cell/header), `@tiptap/extension-text-align`, `@tiptap/extension-subscript`, `@tiptap/extension-superscript`, `@tiptap/extension-highlight`, `@tiptap/extension-character-count`.
- Footnotes: **in-house** (resolved at plan time — no TipTap-3-compatible community extension exists): atomic inline `footnoteRef` node carrying a `noteId`; note text is plain text in the `footnotes` column, edited via a small popover; numbering derived from document order. Export renders real .docx footnotes; the PDF view renders an endnotes "Notes" section (MLA-sanctioned).
- Citations: custom **atomic inline node** `citationChip` with attrs `{ sourceId, locator }` (locator = page number etc.). Renders formatted text per the doc's style; re-renders on style switch; deletes as one unit.
- Works Cited: read-only React block (`WorksCitedPreview`) rendered below the editor, generated from `sources` + style (simplified at plan time from a pinned TipTap node — derived, non-editable content needs no editor node; export composes it independently).

**Layout:** pageless writing surface — centered column ~700px max, serif body type, white card on cream (light-theme tokens; never hardcode colors). Sticky toolbar: undo/redo, block style dropdown (P/H1–H3), bold/italic/underline, alignment, lists, blockquote, table, image, footnote, link, **Cite**, export menu. Inline-editable title above the doc. Footer: live word count (character-count extension) + save status. Studio sizing rules: `text-sm` toolbar, `w-4 h-4` icons.

**Mobile/iOS:** same page in the app shell; toolbar wraps and remains visible above the keyboard; shell reserves the docked bottom bar height; no swipe navigation.

**Images:** upload to `personal-docs/{user_id}/{docId}/…` in the private bucket with an owner-scoped storage policy (`(storage.foldername(name))[1] = auth.uid()::text` on the prefix), served through the storage proxy. Do not repeat the broad `authenticated SELECT` pattern flagged in the storage cross-tenant audit.

## Autosave

- Debounced ~2s after typing stops; also on blur/navigate.
- `update … .select()` — `.select()` is mandatory (demo-tenant writes fail silently without it). Treat empty result as failure.
- Register the dirty editor in the `unsavedWork` registry so boot-reload/update prompts before discarding.
- Save status in footer: Saved / Saving… / "Not saved — check connection" with retry + backoff.
- Concurrency: single owner; two-tabs-open is last-write-wins. Accepted v1 limitation, documented here.

## Citation manager

- **Add source:** choose type → structured form. Shortcuts: paste DOI → Crossref (`api.crossref.org`), paste ISBN → Open Library (`openlibrary.org`). Both free, keyless, CORS-friendly; **both hosts must be added to the CSP `connect-src` meta tag in index.html.** Lookup failure or no match falls back silently to the manual form — never blocks.
- Plain-URL metadata scraping: **out of scope v1** (needs a proxy endpoint).
- **Cite in text:** cursor in place → Cite → pick source, optional page → insert `citationChip`. MLA: `(Southern 132)`. APA: `(Southern, 1997, p. 132)`.
- **Works Cited / References:** generated at doc end — alphabetized by author family name, hanging indent, MLA 9 or APA 7 rules from `citationFormat.ts`. Hand-written formatters for the four source types; **no citeproc/CSL dependency.**
- Style switch (MLA ↔ APA) re-formats chips and the generated section in place.
- Deleting a source that has chips in the text: warn, then remove chips with the source.

## Export

- **.docx (primary):** client-side via the `docx` npm library. `docxExport.ts` walks TipTap JSON and emits: Times New Roman 12pt, double-spaced, 1″ margins, first-line ½″ paragraph indents, running header (MLA: last name + page number, right-aligned; APA: page number), heading block from `paper_meta` (MLA: name/instructor/course/date block; APA: title page), footnotes as real Word footnotes, tables/images embedded, Works Cited with hanging indents.
- **PDF:** print-formatted preview route rendering the same formatted output with a print stylesheet (`@page` 1″ margins, double spacing, page numbers) → browser print-to-PDF / iOS share sheet. No server-side PDF service.
- `ExportDialog` collects `paper_meta` on first export; one-click after.
- Filename from title, slugified: `The-Spirituals-of-Eileen-Southern.docx`.

## Error handling

| Failure | Behavior |
|---|---|
| Autosave error / empty `.select()` result | Retry with backoff; footer shows not-saved state; `unsavedWork` guards reload |
| Crossref / Open Library down or no match | Silent fallback to manual source form |
| Image upload failure | Toast; no orphaned image node inserted |
| Doc fails to load | Error state with retry; never an empty editor that could overwrite content |
| Delete doc | Confirmation dialog (irreversible) |

## Testing

- **Unit (vitest):** `citationFormat.ts` — fixture per source type × style, including multi-author, no-author (title-first), and missing-field cases; `docxExport.ts` — structural assertions on generated document (styles, header, footnote count, hanging indent); word-count derivation.
- **Migration test:** `supabase/migrations/tests/` asserting RLS enabled + four owner policies, mirroring `personal_music_library_test.sql`.
- **Manual QA:** iPad/iPhone editor pass (toolbar above keyboard, no swipe-nav conflicts), export share sheet on iOS, export opened in Word and Google Docs to confirm formatting.
- Run vitest from this feature's own worktree (`npm ci --legacy-peer-deps` there — shared-checkout runs pollute).

## Out of scope (v1)

Sharing/collaboration and teacher comments; Academy assignment submission; Google Drive/Docs integration; URL metadata scraping; page-view while editing; .docx **import**; shared cross-doc source library; version history beyond autosave.

## Rollout

Single PR: migration + feature. No feature flag needed (additive, owner-private). Deploy via the standard frontend deploy script; verify `CACHE_VERSION` matches main tip after deploy.
