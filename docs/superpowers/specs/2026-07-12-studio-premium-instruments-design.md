# Studio Premium Instruments — Design

**Date:** 2026-07-12 · **Status:** Approved (Kevin) · **Approach:** B — self-hosted premium bank + velocity-layered sampler

## Goal

Give Studio's MIDI tracks a set of genuinely great-sounding core instruments — piano, choir, strings, organ, guitars, and real drum kits — while keeping the full 128-instrument General MIDI catalog (MusyngKite via gleitz.github.io) as the broad fallback. All new samples come from free/open-license libraries (CC0 / CC-BY / CC-BY-SA; no NonCommercial), converted once and self-hosted on DigitalOcean Spaces.

## Instrument list

| Preset id | Instrument | Source | License | Velocity layers |
|---|---|---|---|---|
| `gw:grand_piano` | Grand Piano (Studio) | Salamander Grand Piano V3 (Yamaha C5) | CC-BY 3.0 | 4 (of 16) + release samples |
| `gw:choir_aahs` | Choir Aahs (Studio) | Best free option (VCSL vocals / FreePats choir), chosen at build time | CC0 | 1–2 |
| `gw:string_ensemble` | String Ensemble (Studio) | VSCO 2 CE section strings | CC0 | 2 |
| `gw:violin` | Violin (Studio) | VSCO 2 CE solo violin | CC0 | 2 |
| `gw:cello` | Cello (Studio) | VSCO 2 CE solo cello | CC0 | 2 |
| `gw:pizzicato` | Pizzicato Strings (Studio) | VSCO 2 CE | CC0 | 1 |
| `gw:pipe_organ` | Pipe Organ (Studio) | FreePats organ (license-verified; no NC) | CC0/CC-BY | 1 |
| `gw:electric_piano` | Electric Piano (Studio) | FreePats / Greg Sullivan E-Pianos | CC0/CC-BY-SA | 2 |
| `gw:guitar_nylon` | Acoustic Guitar · Nylon (Studio) | FreePats Spanish Classical Guitar | CC0/CC-BY | 2 |
| `gw:guitar_steel` | Acoustic Guitar · Steel (Studio) | Iowa MIS / VCSL / FreePats (best-licensed) | permissive | 1–2 |
| `gw:kit_studio` | Drum Kit · Studio | Salamander Drumkit | CC0/CC-BY | 3–4 per drum |
| `gw:kit_rock` | Drum Kit · Rock | AVL Red Zeppelin (if license confirms) | CC-BY-SA | 3–4 |
| `gw:kit_jazz` | Drum Kit · Jazz | AVL Black Pearl 5-piece (if license confirms) | CC-BY-SA | 3–4 |

Exact sources are pinned in `scripts/studio-samples/SOURCES.json` produced during the build; licenses verified against each library's published terms. Attribution collected in `CREDITS.md` (repo) and surfaced in the Studio UI (CC-BY requires it). If the AVL kits fall through, ship `kit_studio` and substitute another permissive kit or drop to two kits.

## Sample pipeline & hosting

One-time conversion tooling in `scripts/studio-samples/` (Node + ffmpeg, run locally, not part of the app build):

1. Sources downloaded per SOURCES.json (multi-GB, scratch only — never committed).
2. **Pitched instruments:** keep the minor-third note grid used today (C/Eb/Gb/A × octaves spanning the instrument's real range) at N velocity layers. **Kits:** keep every sampled drum note, 3–4 velocity layers, first round-robin.
3. Convert FLAC/WAV → MP3 160 kbps 44.1 kHz mono-preserved.
4. Emit `manifest.json` per instrument: `{ layers: [{ maxVel: 42, urls: { "C4": "l1/C4.mp3", ... } }, ...], release?: {...}, kit?: { "38": [{maxVel, url}, ...] } }` — the engine is fully manifest-driven, no hardcoded file lists.
5. Upload to the existing `glee-world` Space (SFO3) under `studio-samples/<instrument>/`, per-object public-read, `Cache-Control: public, max-age=31536000, immutable`.

App streams from `https://glee-world.sfo3.digitaloceanspaces.com/studio-samples/…` — already allowed by the CSP (`https://*.digitaloceanspaces.com` in connect-src). Nothing ships in the app bundle; iOS is unaffected by sample updates.

## Engine

New module `src/lib/studio/engine/layeredSampler.ts`:

- **LayeredSampler** (pitched): fetches the instrument manifest, builds one `Tone.Sampler` per velocity layer, routes `triggerAttack/Release` by velocity to the correct layer's sampler. Optional release-sample layer for piano. Same `EngineInstrument` interface as today (attack/release for live MIDI input, attackRelease for playback), so LiveVoices, sustain-pedal handling, playback scheduling, and offline render work unchanged.
- **KitSampler** (drums): manifest `kit` map of MIDI drum note → velocity-layered one-shots via `Tone.Player` pool; one-shot semantics (release is a no-op), matching the existing basic-kit contract.
- Loading: lazy, like GM today — triggers before load are silently dropped; manifest + samples cached by the browser (immutable cache headers).
- Catalog: `src/lib/studio/gwInstruments.ts` — the premium list (ids, labels, manifest URLs), `gw:` preset prefix, `fromGwPresetId`. `buildSampler()` in `engine/instruments.ts` checks `gw:` before `gm:`.

**Compatibility:** `preset_id` is a free string in schema 1.0.0 — no schema bump. Old clients (including iOS 1.0.3) that open a session with a `gw:` preset fall back to the basic kit sound; no validation error, no crash.

## UI

`MidiInstrumentDropdown` in StudioEditor gets a **“Studio” optgroup at the top** (premium instruments, then the three kits), above Synth/Kit/GM groups. A small “Sound credits” link in Studio settings (or the existing about/footer surface) renders the attribution list. No other UI changes.

## Testing

- Unit: catalog integrity (ids unique, URLs well-formed), velocity→layer routing math, manifest parsing, kit note mapping (vitest — note `tsc --noEmit` is a no-op in this repo).
- Pipeline: manifest validator run after upload; spot-check HTTP 200 + cache headers on sampled URLs.
- Manual/browser: load each premium instrument in Studio preview, play soft/loud notes (layer switch audible), pedal-hold on piano, kit GM notes 35–51; verify GM instruments still work.

## Out of scope

Whole-bank WASM SoundFont engine (possible future phase), commercial choir licensing (explicit later upgrade slot), InstrumentPlayer/score-to-mp3 migration to the premium bank.
