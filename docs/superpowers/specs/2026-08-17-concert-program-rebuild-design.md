# Concert Planner Rebuild — True-Paper 8.5×11 Programs

**Date:** 2026-08-17
**Status:** Approved by Kevin (brainstorm session 2026-08-17)
**Owner:** Kevin Johnson
**Visual model:** 1943 McMurry College recital program (UNT Portal to Texas History, ark:/67531/metapth795185) — single letter sheet, centered "Program" heading, piece titles with dot leaders to right-aligned composer surnames, performer credit lines centered under piece groups, ornamental —o— divider, accompanist credit, organization + date at the foot.

## Why

Concert Planner's print story is fictional: the Print button is a bare `window.print()` with no `@page` size, no physical units, no pagination, and a hostile global print stylesheet (`src/index.css` ~2390: forces colors, appends raw URLs after links). The "letter-portrait / half-fold / trifold" picker only changes screen max-widths (`src/lib/concertPlanner/themes.ts:117-130` admits the paper stylesheet "handles actual geometry" — it was never written). Publish is blocked in practice — the approval checkbox exists (ValidationBadge), but `validateProgram` requires every piece to have a composer AND a non-'unknown' `rights_status`, and rights has only a buried per-piece editor most users never find; the QR is a hand-drawn fake, and the schema's best ideas — `sheet_music_id`, `setlist_id`, `section_heading`, `soloists`, `voicing`, `subtitle`, `notes` — have no UI.

Kevin's requirement: programs are **created, printable, and editable** — edited directly on a true 8.5×11 page in GleeWorld, printed (or saved to PDF) from the app, in letter-portrait and half-fold booklet formats, with a small set of classic print-first designs modeled on the 1943 program.

## Decisions locked during brainstorming

- **Editing happens in GleeWorld, on the page** (WYSIWYG on true-size sheets). No .docx path.
- **Formats: 8.5×11 portrait + half-fold booklet** (5.5×8.5 panels imposed on 11×8.5 landscape sheets). Trifold and qr-lobby retire.
- **Content: type-in + Music Library picker + one-time Setlist import** (copy, not live sync).
- **Visual: 3 print-first designs** (`classic-1943`, `modern-clean`, `formal`) replacing the 8 screen themes. Tenant logo/org name optional on the title block.
- **Public page + QR kept:** publish fixed (real approval checkbox), real QR (`qrcode` lib as used by ticketing), `/program/:slug` re-rendered phone-friendly from the same content.
- **Rendering approach: true-paper HTML/CSS** (Worship Aid pattern — `src/components/liturgy/WorshipAidSheets.tsx`, `src/lib/liturgy/aidPage.ts`, `src/lib/liturgy/flow.ts`), browser print dialog for paper AND PDF. No pdf-lib/jspdf.

## What exists and is reused

| Piece | Where | Reused for |
|---|---|---|
| `gw_concert_programs`, `gw_concert_program_pieces`, `gw_concert_roster_sections/_members` | `supabase/migrations/20260617120000`, `20260621240000` | Kept as-is; source of truth for pieces + roster |
| Anon published RLS policies | `20260621240000` L156-192 | Public page unchanged |
| Inch-based sheet rendering + `@page size` | `WorshipAidSheets.tsx:466`, `lib/liturgy/aidPage.ts` | The paper renderer pattern (NOTE: its `flow.ts` paginates by static line budgets — the measured-height two-pass pagination below is greenfield, not a port; budget accordingly and guard against measure→setState render loops, cf. WorshipAidSheets.tsx:416-419) |
| Print portal overlay + scoped `@page` injection + global-print-CSS neutralization | `src/components/documents/PrintPaperView.tsx`, `src/styles/print-paper.css` | The print-dialog mechanism |
| Music Library browse queries | `gw_sheet_music_browse` view, MusicLibraryPage | Library picker |
| Setlists | `gw_setlists` + `gw_setlist_items` (`music_id → gw_sheet_music`, `order_index`) | Setlist import |
| `qrcode` lib | ticketing flows | Real QR on publish |
| Tenant branding | `useBrandingSettings` (MUST stay pinned to `getTenantSlug()`), bucket `site-branding` | Optional logo/org name on title block |
| Module gating | `gw_billing_modules` id `concert_planner`, `hasModule('concert_planner')` | Unchanged |

## The block model

A program document is an ordered list of **blocks** flowed onto pages. Block kinds:

```ts
type ProgramBlock =
  | { id: string; kind: 'title'; showLogo: boolean; showOrgName: boolean }        // title/subtitle come from program header fields
  | { id: string; kind: 'piece-group'; sectionHeading: string | null;
      pieceIds: string[];                    // ordered refs into gw_concert_program_pieces
      creditLine: string | null }            // centered under the group, e.g. performer name
  | { id: string; kind: 'divider' }          // ornamental —o— rule
  | { id: string; kind: 'text'; text: string; align: 'center' | 'left' }
  | { id: string; kind: 'roster' }           // renders roster sections/members in columns
  | { id: string; kind: 'footer' }           // org name + event_date + venue from header fields
```

- Pieces and roster rows remain **relational** (existing tables). `blocks` stores structure and order only, referencing pieces by id. Deleting a piece removes its id from any `piece-group`; a group emptied of pieces is removed.
- Piece line rendering: `title ……dot leaders…… composer` (surname or full, as typed); `arranger` renders as ", arr. X" after composer; optional second line (smaller, indented) shows `voicing`; the convention is: per-piece `soloists` renders as an indented italic line under that piece; the group-level `creditLine` is for the performer of the whole group (the 1943 pattern). They compose — a group may have both.
- `duration_seconds` never prints; it feeds the running-total badge in the editor only.
- Flow rules: a `piece-group` never splits across pages; `roster` may split between sections; everything else is atomic.
- **blocks ↔ pieces consistency (decided, not implied):** adding a piece inserts the row with `.select('id')` FIRST and only then patches `blocks`; if the blocks patch fails, the UI rolls back and retries — never a silent half-state. On every load a reconciler self-heals: `pieceIds` with no matching row are dropped, and piece rows referenced by no block are appended to the last piece-group (visible, never orphaned) — so `validateProgram` (which iterates raw piece rows) and the page always agree. The renderer defensively skips dangling ids.
- **`sort_order` has one writer:** any reorder (drag, popover up/down, group moves) rewrites `gw_concert_program_pieces.sort_order` to match the flattened block order in the same debounce tick, so legacy readers of `.order('sort_order')` and `deriveDefaultBlocks` never see drift. `blocks` is authoritative; `sort_order` is its mirror.

## Print designs

Three designs, pure styling over the same blocks — switching design never touches content. All type in points, all geometry in inches.

- **`classic-1943`** (default): Libre Baskerville / Playfair Display (already preloaded in index.html); centered small-caps-ish "Program" heading; dot leaders (flex line: title span, flex-1 spacer with `border-bottom: 1px dotted` sitting on the text baseline via a small negative bottom offset, composer span — if the dotted border reads too sparse against the model, the fallback is a `repeating-linear-gradient` dot fill, but the dotted-border technique is the spec'd default); centered credit lines; —o— divider.
- **`modern-clean`**: Montserrat (preloaded; Inter is NOT in index.html's font link — do not reference it); left-aligned pieces, composer right; thin rules instead of dot leaders.
- **`formal`**: Cormorant Garamond/Cinzel; centered, generous leading, small ornaments.

Tenant logo (from `gw_branding_settings.logo_url`) and org name are per-program toggles on the title block, off by default for `classic-1943` (the model leads with "Program").

## Page geometry & pagination

- Letter portrait: sheets are `width: 8.5in; height: 11in`, interior padding 0.75in; `@page { size: 8.5in 11in; margin: 0 }`.
- Half-fold: content flows into 5.5×8.5in panels (0.5in interior padding), imposed onto 11×8.5in landscape sheets: for N panels (padded to a multiple of 4), sheet k front = [panel N−2k | panel 1+2k], back = [panel 2+2k | panel N−1−2k] — standard saddle order; a pure function `imposeHalfFold(panels: Panel[]): Sheet[]` implements and tests it. Editor shows reading order; imposition applies only in the print view, with a "print double-sided, flip on short edge" hint.
- `paginateProgram(blocks, heights, format): Page[]` is a pure function in `src/lib/concertProgram/paginate.ts` operating on MEASURED heights: blocks render into a hidden off-screen container at true content width (same fonts/design classes), their `offsetHeight`s are read after `document.fonts.ready`, and the pure function splits them into pages. Estimated heights are NOT acceptable — long titles wrap, and a wrong estimate on a fixed 11in sheet silently clips content at print. Re-measure on content/design/format change (debounced with the autosave tick).
- Print mechanism: portal overlay (PrintPaperView pattern) — `body.printing-program #root { display:none }`, `@page` style injected on mount/removed on unmount, `a[href]::after { content: none }` neutralization, then `await document.fonts.ready` BEFORE `window.print()` (printing straight after first load must not race Google Fonts). The overlay shows a one-line checklist above the page: “In the print dialog: 100% scale (no fit-to-page), margins None” — half-fold adds “double-sided, flip on short edge.” Save-as-PDF in the dialog is the PDF export.
- Imposition's back-side panel order assumes duplex "flip on short edge"; the physical duplex test in Manual QA is the acceptance gate for that assumption, and the imposition function takes a `flipMode` parameter so a printer that behaves differently is a config change, not a rewrite.

## Editor

Route `/dashboard/concert-planner/:id` (list page keeps `/dashboard/concert-planner`). Layout: true-size sheets centered on a neutral canvas, slim right rail. Desktop (lg+) renders sheets at 100% and edits in place. Below lg the sheet scales to fit via a wrapper, but scaled in-place carets and drag are NOT used there (iOS caret and dnd-kit coordinate issues under `transform: scale`): tapping any text opens a popover editor at readable size, and reordering uses up/down controls in the popover. Rail:

- **Add piece** (blank row) · **Add from Library** · **Import Setlist**
- **Add** text / divider / roster block
- **Design** (3 designs) · **Format** (letter / half-fold) · header fields not on the page (call_time, target length)
- **Publish** · **Print / Save PDF**

Editing: every printed text is a click-to-edit inline input/textarea styled identically to print output (`@media screen` affordances only — hover outlines, drag handles, add buttons between blocks — nothing prints). Piece reorder = drag within/between groups (dnd-kit, already used; desktop pointer only per above). Block reorder = drag whole blocks. Autosave: 700ms debounced diff-only patches (current editor's discipline), `.select()` after writes.

**Roster entry keeps its fast path:** the roster block on the page is click-to-open into the existing RosterEditor interaction (Enter-adds-next-name, per-section voice dictation) presented as a popover/rail panel — NOT per-name on-page carets — and gains bulk paste (a pasted multi-line block splits on newlines into members). Entering 40 names must be a paste or one dictation session, not 40 clicks.

**Fast entry (load-bearing usability):** a 1943-style program is twenty one-line entries — Enter at the end of a piece title commits it and creates the next piece row in the same group; Tab moves title → composer → (Enter = next piece); each piece-group has an inline "+ piece" row on the page. The rail's "Add piece" appends to the last group (or creates one). Data entry must be possible without touching the mouse.

**Publish blockers are fixable from the page:** selecting a piece shows screen-only ghost chips for its empty optional fields ("+ arranger · + voicing · + soloists") and a rights control (`rights_status` select + `copyright_info`) in the piece popover. The Publish panel lists every validation blocker ("3 pieces missing rights status") with click-to-jump — the current build's fatal flaw is that rights blockers exist with no visible path to clear them; the rebuild makes that path one click.

**Undo for destructive actions:** deleting a piece, block, or group shows a toast with Undo that restores the removed content from an in-memory snapshot (single-level; not a general undo stack). Text edits don't need it (they're non-destructive and debounced).

**Concurrent editing:** last-write-wins across tabs/users, unchanged from the current editor — stated as a known limit, not silently assumed.

The card editor, 8 themes, `template_kind` tiles, trifold/qr-lobby, and the AI regen dialog retire. (Regen may return later against the block model; explicitly out of scope now.)

New-program flow: title + optional "start from setlist" in one dialog → creates program with a default block list (title, one empty piece-group, divider, footer).

## Library picker & Setlist import

- **Picker dialog:** searches tenant Scores (`gw_sheet_music_browse`) and My Music (`gw_personal_scores`, storage-backed rows) by title/composer. Selecting adds a piece with `title/composer/voicing` prefilled, `sheet_music_id` set (tenant scores only; personal picks leave it null). Fields remain editable; no write-back.
- **Setlist import:** lists `gw_setlists` for the tenant; import copies items (ordered, joined to `gw_sheet_music` for composer/voicing) into pieces inside one new piece-group, sets `setlist_id` on the program. One-time copy; re-import appends a new group rather than syncing.

## Publish, QR, public page

- Rights validation stays (`validation.ts`); the approval checkbox actually renders next to Publish; `canPublish` logic unchanged.
- Publish generates slug (existing scheme) + real QR via `qrcode` → data-URL PNG shown in modal with download; optional per-program toggle "QR in footer" prints a small QR beside the footer block (disabled with an explanatory hint until the program is published — an unpublished QR would encode a dead URL).
- `/program/:slug` (`PublicConcertProgramPage`) re-renders from the same block model in a single phone-friendly column using `classic-1943` typography tokens; no fake paper on phones. Existing anon RLS untouched. The dead card-renderer duplication is replaced by shared block renderers (`src/components/concert-program/blocks/*` used by editor page, print view, and public page — one formatting path).

## Data model changes (one migration)

```sql
ALTER TABLE gw_concert_programs
  ADD COLUMN print_design text NOT NULL DEFAULT 'classic-1943'
    CHECK (print_design IN ('classic-1943','modern-clean','formal')),
  ADD COLUMN blocks jsonb NOT NULL DEFAULT '[]';
-- print_format: UPDATE existing 'trifold'/'qr-lobby' rows to 'letter-portrait',
-- then ALTER TABLE ... DROP CONSTRAINT gw_concert_programs_print_format_check
-- (the auto-generated name from 20260621240000's inline CHECK — verify with \d
-- before deploy) and ADD the new CHECK ('letter-portrait','half-fold').
```

- Existing programs: a client-side `deriveDefaultBlocks(program, pieces, roster)` builds the block list when `blocks = '[]'` — title, piece-groups split on stored `section_heading` changes, a text block from legacy `notes` when present, roster if members exist, footer. The EDITOR persists the derived list on first open; the PUBLIC page derives read-only in memory (anon can't write), so legacy published programs render correctly even if never reopened in the new editor. No data backfill in SQL.
- Columns retired but NOT dropped yet: `theme`, `template_kind`, `card_layout`, `design_state`, `canva_design_id`. Drop in a later cleanup once the new editor has soaked.
- RLS: unchanged (existing tenant-isolation + member-rw posture; tightening write access to librarian/admin is a separate decision, out of scope).

## Error handling

- Pagination overflow (a single block taller than a page — e.g., 40-piece group): the group splits at the piece boundary as a last resort, with a printed "(continued)" section heading; editor shows a warning chip.
- Empty required content: printing with zero pieces prompts "This program has no pieces — print anyway?".
- Library/setlist queries failing → toast + dialog stays open; never a half-imported group (import wraps inserts in order and rolls back UI state on failure).
- Half-fold with content exceeding panel count: panels pad to multiple of 4 with blanks (standard booklet behavior); a page-count line in the Format control shows "6 panels → 2 sheets (2 blank panels)".

## Testing

- Pure-function unit tests: `paginateProgram` (group-never-splits, overflow continuation, roster splitting), `imposeHalfFold` (4/8/12 panels, blank padding), `deriveDefaultBlocks` (section_heading grouping, legacy programs).
- Component tests (jsdom): inline edit round-trip persists via debounced patch; Enter-creates-next-piece and Tab order; delete-then-Undo restores a piece; library picker prefills and sets `sheet_music_id`; setlist import creates group + sets `setlist_id`; publish gate needs the checkbox; QR renders from a real slug; public-page derive fallback renders a legacy program with empty `blocks`.
- Visual gate: a rendered `classic-1943` sample page is compared against the 1943 model with Kevin before the feature is called done.
- Manual QA: print from Chrome + Safari to paper and PDF at 100% scale (no browser fit-to-page), half-fold duplex flip-short-edge on a real printer, public page on a phone.

## Out of scope (explicitly)

Trifold; QR-lobby poster format; image/cover-photo blocks (logo only); per-block font overrides; AI regen; live setlist sync; roster import from membership tables; write-back to the Music Library; dropping retired columns; role-gating program writes.
