# Studio: Option-drag Duplicates a Clip

**Date:** 2026-07-13
**Status:** Approved (Kevin, 2026-07-13)

## Decision

Hold Option/Alt and drag a clip body in the Studio timeline (Logic/GarageBand
style): a copy stays behind at the original position, and the clip you're
dragging moves to wherever you drop it. Works identically for audio and MIDI
clips. Desktop pointers only (hardware Alt key, including an iPad with a
keyboard) — there is no touch equivalent. No Esc-cancel, matching every other
drag in the timeline. The cursor shows `copy` for the duration of an alt-drag.

## Mechanism

The existing body-drag (`onDragBody` in `DraggableClip`) already moves the
clip in place via `onChange({ start })`. Alt-drag duplication reuses that
unchanged: on pointer-down, if `e.altKey` and an `onDuplicate` callback is
wired, the parent inserts a clone at the clip's *current* position before the
move loop starts. The drag then proceeds exactly as a normal move — net
effect, a copy is left behind and the original clip travels to the drop
point.

## Files touched

- `src/lib/studio/clipOps.ts` — new pure `duplicateClip(clip, newId)`: shallow
  copy + new id, with `notes`/`cc` (MIDI) deep-copied per-element so the copy
  never aliases the original's arrays/objects.
- `src/lib/studio/clipOps.test.ts` — new id + scalar equality, independent
  audio copy, deep-copied MIDI notes/cc.
- `src/pages/studio/StudioEditor.tsx` — `DraggableClip` gains optional
  `onDuplicate`; `onDragBody` fires it on `altKey` before the move logic and
  sets `cursor: copy` while dragging; `AudioClipBlock`/`MidiClipBlock` pass it
  through; both clip-render call sites (~line 4780-4810) wire it to append
  `duplicateClip(clip, crypto.randomUUID())` to that track's clips array via
  the same immutable `onUpdate` pattern used by neighboring `onChange`/
  `onRemove` wiring. Tooltip hint text extended to mention "⌥-drag to copy".

## Non-goals

- Touch/iPad-without-keyboard duplication gesture (no established touch
  equivalent, not in scope for this pass).
- Esc-cancel for any drag (pre-existing gap across all drags, not introduced
  or fixed here).
