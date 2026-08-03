# Seating chart editor — chart-first redesign (icon rail + flyouts)

**Date:** 2026-08-02
**Status:** Approved

## Goal

The chart is the hero. Kill the fixed left/right panels and the scrolling
icon-soup toolbar; tools live in a slim icon rail whose panels slide over the
canvas instead of squeezing it.

## Layout

- **Top bar (slim):** back, chart name, save status, arrangement switcher,
  Reload, Save. Nothing else.
- **Icon rail** (~48px, left, md+): People, Objects, Properties (selection
  badge), divider, Auto-place, Groups, Attendance, divider, Share & export.
- **Flyouts:** absolutely positioned over the canvas (left of rail), w-72,
  header with title + close. Canvas never reflows. Esc or re-clicking the
  active icon closes. Properties auto-opens when a seat/object is selected
  and closes on deselect.
- **Phone (<md):** the rail renders as a bottom icon bar; People / Objects /
  Properties / Share open bottom Sheets reusing the same panel components.
  Auto-place and Groups open their dialogs as today.

## Components

- `editor/EditorRail.tsx` — rail (vertical md+ / horizontal phone), 44pt
  touch targets, `bg-card`, active item `bg-accent`.
- `editor/EditorFlyout.tsx` — overlay panel shell (title, close, Esc).
- `engine/PeoplePanel.tsx` + `engine/ObjectsPanel.tsx` — split from
  `Palette.tsx` (which is deleted). PeoplePanel gains the "Import roster"
  button (moves out of the top bar).
- `PropertiesPanel` — outer `aside` stops hardcoding width/border; the
  flyout/sheet owns sizing.
- Share & export flyout hosts: Share, Print, Export PNG, Export PDF buttons
  plus the existing self-contained popover tools (Attendance stays its own
  rail item; Orchestra tools, Snapshots, Calendar links live here as
  labeled rows).

## Canvas upgrades ("too small to see")

- Visible zoom − / + / Fit control bottom-right (wheel/pinch still work),
  token colors, ≥ h-8 buttons.
- Seat label font floor raised (9px → 11px, cap 13px) so names are legible
  at fit zoom.
- With no fixed side panels, fit-zoom gains ~330px of width on a laptop.

## Non-goals

- No data-model/backend changes. Existing dialogs (Placement, Import,
  Share, Groups) untouched. ViewPage untouched (it picks up the zoom
  control via CanvasEngine automatically).

## Testing

`npm run typecheck:guard`, eslint on changed files, production build,
existing seating-charts vitest suite.
