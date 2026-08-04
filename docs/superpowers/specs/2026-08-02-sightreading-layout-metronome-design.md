# Sight-reading exercises: iPad 4-across layout + practice metronome

Date: 2026-08-02. Approved by Kevin in-session (fit behavior: prefer 4, allow
fewer; scope: sight reading only; metronome: count-in + click; tempo: student
BPM control).

## Layout

`NotationView` previously capped rows at 4 measures (2 under 768px) but its
content-aware fit check added 20px breathing room per measure, so iPad-width
containers routinely wrapped at 3. New optional `targetPerRow` prop: when set,
the fit check drops the per-measure pad to 0 so rows fill to the target
whenever the measures' true minimum widths fit; genuinely dense bars still
wrap earlier (safety valve), and phones still cap at 2. The row-packing loop
is extracted to `src/pages/notation/packRows.ts` (pure, unit-tested).
`SingFlow`'s notation strip passes `targetPerRow={4}`; the notation editor is
unchanged (no prop → previous behavior, user-authored system breaks intact).

## Metronome

The take's four-beat count-in was visual-only (a code comment claimed
"audible" but no clicks existed). New `src/lib/sightReading/metronome.ts`:

- `clickSchedule()` — pure beat grid: count-in beats then one click per
  exercise beat (ceil over fractional realized lengths), accents on the
  count-in "1" and each measure downbeat per the exercise meter.
- `playClicks()` — renders the schedule on a short-lived AudioContext (same
  isolation pattern as `playPriming`). Count-in clicks loud (0.3–0.4 gain);
  clicks under the take quiet (0.07–0.1) because the mic runs with
  echoCancellation off and a loud speaker click would bleed into the pitch
  tracker. Short sine bursts, 1400 Hz accented / 1000 Hz unaccented.

Clicks are scheduled at the same instant the count-in timers and mic beat
clock are anchored (right after `mic.start()` resolves), so audio, the
on-screen count, and scoring agree to within a few ms. Every exit path
(take end, Stop, unmount) closes the metronome context.

## Controls (SingFlow header)

- BPM stepper (♩ = N, ±5, clamped 40–180), initialized from the exercise's
  written tempo. The chosen BPM feeds `mic.start()`, the beat math, and the
  metronome, so rhythm scoring adapts to slow practice automatically.
- Metronome toggle ("Click on/off"), default on; off restores the silent
  visual count-in. Both controls lock during a take.
