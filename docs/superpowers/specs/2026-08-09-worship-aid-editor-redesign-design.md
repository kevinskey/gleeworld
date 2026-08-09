# Worship Aid editor — two-pane redesign

**Date:** 2026-08-09
**Status:** Approved, ready for implementation planning
**Surface:** `src/pages/dashboard/WorshipAidPage.tsx` (route `/dashboard/liturgy/:id/worship-aid`)

## Problem

The worship aid creator is one vertical column at `max-w-6xl`. Controls stack
top to bottom — print settings, cover and spine, notices, Phone edition, an
overflow warning, and a collapsed `<details>` holding the panel/block editor —
and the rendered `WorshipAidSheets` sits last, below all of it.

Every change therefore costs a round trip: scroll down to see what the sheet
looks like, scroll back up to adjust it. The loop that matters most — fitting
content so nothing overflows the fold — is the one the layout makes hardest,
because the overflow warning and the sheet it describes cannot be on screen at
the same time as the controls that fix them.

## Goals

- The sheet stays visible while any control is used.
- All four editing tasks stay reachable without hiding the sheet: fitting
  content to the page, wording, cover/spine/toggles, and adding blocks.
- The panel being worked on is shown large enough to read.
- Printing and the archived PDF are **byte-identical to today**.

## Non-goals

- No change to the worship aid data model, `aidEdits.ts`, `worshipAid.ts`, or
  the flow engine.
- No change to what the sheet renders — only to how it is presented on screen.
- No new persistence, no schema change.
- Not a visual redesign of the sheet itself.

## Decisions taken during brainstorming

| Question | Decision |
| --- | --- |
| Target screen | Both desktop and iPad, roughly equally — must degrade, not just reflow |
| What is edited while looking at the sheet | All four: fitting, wording, cover/spine/toggles, adding blocks |
| How much of the sheet is visible | The panel being worked on, large; panel switcher changes it |
| Layout | Two-pane workspace (control rail + pinned stage) |

## Design

### 1. Layout shell

Replace the single `max-w-6xl` column with a two-pane workspace.

At `lg` and above: a CSS grid of `minmax(340px, 380px) 1fr`, both panes sized
to the viewport height minus the dashboard header, each its own scroll
container. The rail scrolls independently of the stage, so no control can move
the sheet.

Below `lg`: one column. The stage takes the full width; the rail moves into a
bottom drawer (the existing `Sheet` primitive). A persistent bottom bar opens
it and always shows the current panel name and the overflow count, so the
status is legible even while the drawer is closed.

### 2. Content placement

**Rail**, top to bottom:

1. Panel tabs — Cover / Inside left / Inside right / Back. `front` joins the
   selectable set; today the block editor offers only the three interior
   panels.
2. Block list for the selected panel. Controls are unchanged: move up/down,
   heading field, spacing ±, delete, restore-removed, and the Text / Score /
   Space insert buttons. It is no longer wrapped in `<details>` — this is the
   primary task, not an advanced one.
3. Collapsed by default, in order: Cover & spine, Notices (welcome, communion,
   sending), Phone edition, Printing tips.

**Stage**:

- A sticky strip at the top carrying the panel name and the overflow badge
  (`N lines over`, `M dropped`). The overflow warning moves out of its
  standalone destructive card and onto the stage, so it sits beside the sheet
  and next to the controls that resolve it.
- The selected panel, rendered large.

### 3. Focus and scale without touching print or PDF

This is the constraint that shapes the implementation.

`WorshipAidSheets` renders all four panels at exact inch dimensions. Two
consumers depend on that DOM:

- **Print** — `window.print()` prints the same DOM as vector type.
- **Archive PDF** — `worshipAidToPdf(sheetsRef.current)` runs **html2canvas**
  over every `.worship-aid-sheet` inside the ref.

html2canvas is sensitive to both `display: none` and CSS transforms. Hiding
non-focused panels would drop them from the archived PDF; scaling the wrapper
would rasterise it at the wrong size. Either would corrupt the archive
silently — the PDF is filed and not looked at until someone needs it a year
later.

Therefore:

- `WorshipAidSheets` keeps rendering exactly the DOM it renders today. The
  focus behaviour is a presentation layer above it, not a prop that changes
  what is rendered.
- The stage wrapper carries a `data-aid-view` attribute (`focus` | `full`).
  Screen-only CSS keyed off `data-aid-view="focus"` isolates and scales the
  selected panel.
- `@media print` resets that CSS entirely, so print never sees it.
- `fileToLibrary` sets `data-aid-view="full"` before capture, awaits a frame so
  layout settles, captures, then restores the previous value in a `finally`.
  The capture runs against the pristine DOM.

Scaling fits the focused panel to the stage width via a CSS custom property set
from a `ResizeObserver` on the stage, applied only under `data-aid-view="focus"`.

### 4. Componentisation

`WorshipAidPage.tsx` is 746 lines today and this work would push it past 1,000.
Extract the two new surfaces:

- `src/components/liturgy/aid-editor/AidControlRail.tsx` — panel tabs, block
  list, collapsible settings sections. Props in, callbacks out; no data
  fetching.
- `src/components/liturgy/aid-editor/AidStage.tsx` — sticky status strip, the
  `data-aid-view` wrapper, scale observer, and `WorshipAidSheets`.

The page keeps data loading, save / publish / print / file-to-library, and the
existing `onEditBlock` / `onMoveBlock` / `onSpaceBlock` / `onDeleteBlock`
callbacks, which are unchanged.

### 5. State

- `editPanel` becomes the single selection driving both panes, widened from
  `insideLeft | insideRight | back` to include `front`.
- One new piece of state: drawer open/closed, below `lg`.
- Inline editing on the sheet is unchanged — clicking text on the page still
  edits wording, and the rail's block list stays in sync because both read the
  same `edits` state.

## Error handling and edge cases

- **No blocks on a panel** — the block list shows the existing empty
  treatment; the stage still renders the panel so the user sees it is blank.
- **Cover selected** — the cover has no editable block list; the rail shows the
  Cover & spine section expanded in place of the list.
- **Overflow** — unchanged logic. The badge is a relocation of the existing
  `flow.overflowLines` / `flow.dropped` state, not new computation.
- **Capture while focused** — covered by the `data-aid-view` swap above;
  restoration happens in a `finally` so a failed capture cannot strand the view
  in `full`.
- **Narrow screens** — the drawer must not trap scroll; the sheet remains
  scrollable behind it.

## Testing

- Existing suites must stay green: `src/lib/liturgy/worshipAid.test.ts`,
  `aidEdits.test.ts`, `flow.test.ts`. None of their inputs change.
- Print regression: compare the print DOM before and after the change.
- PDF regression: file a PDF before and after and confirm the same page count
  and panel content, specifically with a non-Cover panel focused — this is the
  case that would break if the `data-aid-view` swap were missed.
- Responsive check at desktop and iPad widths per the repo's verify skill.

## Risks

| Risk | Mitigation |
| --- | --- |
| Archived PDF silently loses panels or rasterises wrong | `data-aid-view` swap before capture, restored in `finally`; PDF regression test with a non-Cover panel focused |
| Print output shifts, breaking the fold | All focus CSS is screen-only and reset under `@media print`; print DOM compared before/after |
| Page file grows unmaintainable | Rail and stage extracted as separate components |
| Two panes disagree about the selected panel | Single `editPanel` state drives both |
