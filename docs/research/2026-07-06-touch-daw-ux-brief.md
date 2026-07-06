# Touch-First DAW UX Standards — Research Brief (2026-07-06)

For Studio DAW sub-project B. 12 load-bearing claims adversarially verified (11 confirmed 3/3; 1 refuted). URLs inline.

## Logic Pro for iPad
- Function buttons (Trim/Loop/Split/Stretch) in tracks menu bar; tap = modal tool, touch-hold = one-shot. Split: playhead top becomes scissors, swipe DOWN to cut (slop-tolerant); zooms in during drag; Apple documents disarming afterward (stuck-scissors gotcha). https://support.apple.com/guide/logicpro-ipad/split-and-join-regions-lpip98d86a3e/ipados
- Selection: tap = select; Multiple Select toolbar mode; touch-hold empty + marquee; hold-first + tap-others.
- Track delete: tap icon → tap again → Delete; plus non-destructive "turn off track".
- Mixer strip order: Input → inserts → sends → Pan → Output → M/S → fader+peak meter+numeric → Rec. Fader: vertical drag, DOUBLE-TAP RESETS 0dB; pan knob = vertical swipe, double-tap centers. Floating mini-"Fader" overlay (vol/pan/M/S/rec of selected track) + scrollable meter bridge = portrait answer. Peak meters: green/orange/red>0dB + peak-hold numeric.
- Export: WAV/AIFF 16/24/32f 44.1–96k, AAC/ALAC 64–320; normalization Off / On / **Overload Protection Only** (downward-only — good default); per-track stem export first-class; share sheet.
- Mastering Assistant: Loudness knob centered ≈ −14 LUFS-I, fixed −1 dBTP limiter, LUFS M/S/I meters (yellow over target), auto-EQ amount, width, correlation. https://support.apple.com/guide/logicpro-ipad/mastering-assistant-parameters-lpip20442167/ipados

## Cubasis 3 vs GarageBand iOS
- Cubasis: armed tool-mode toolbar (Select/Split/Glue/Erase/Draw/Mute) — split = arm tool, tap event, cuts at playhead. Real console (8 inserts pre/post divider, 8 sends, StudioEQ + strip on every track, double-tap resets, numeric dB). Mixdown: WAV/AIFF/FLAC/M4A/MP3 + stems + locator-range + normalize.
- GarageBand: no modes — tap → tap again → popover menu (Split → drag scissors → drag down). NO mixer console (per-track popover: vol/pan/M/S, one-knob comp, 2-band EQ, echo/reverb sends). Export AAC/WAV/AIFF only, no stems, no region export. Anti-pattern: pinch-at-max-zoom toggles snap (undiscoverable).

## Cross-app standards
- Tap = select (universal). Multi: touch-hold empty + marquee (tablet); phone widths deliberately restrict (Soundtrap mobile: one region at a time).
- Split tiers: playhead gesture (Logic/Ferrite) > select→contextual Split (GB/Cubasis/Soundtrap) > keyboard (Ferrite ⌘T, Soundtrap web ⌘E, BandLab 'S').
- Delete: no confirm step anywhere; guardrails target armed-tool accidents, not deletion.
- Precision: pinch-zoom primary; visible snap toggle; "zoom to cut" affordances.

## Channel strip / meters
- Consensus order: gain/trim → HPF → gate → comp → EQ → sends → pan → fader → meter (SSL 4000E reference; order-flexibility is legitimate).
- Fader taper: top half ≈ −10…+10dB, 0dB at ~3/4 travel; Tone.Volume exposes dB directly; exponential ramps to avoid zipper noise.
- Pan law: −3dB constant-power standard (Tone.Panner default = correct); skip configurability.
- Meters: PPM ballistics ≈ 5–10ms attack, 1.7s/20dB release; VU 300ms; LUFS M=400ms S=3s. AnalyserNode gives NO ballistics — build envelope follower. Numeric peak-hold readout matters (GB's biggest complaint).

## Export conventions
- Mobile/web = 2–3 named presets (Soundtrap: MP3 320/Ogg/WAV16); desktop = numeric params. Per-track STEM export is a genuine differentiator for choir SATB part-tracks (GB lacks it). 320 CBR is the user-recognized tier (V0 VBR equivalent quality but obscure).
- REFUTED claim: "Apple/Spotify only turn down" — both boost quiet material (Apple Digital Masters PDF; Spotify limiter in Loud mode only).

## Copy / Skip for GleeWorld Studio
COPY: playhead-scissors split (armed via button, swipe-down, auto-disarm) + 'S'/⌘E keys; GB's tap/touch-hold selection (no modes) + explicit Multiple-Select fallback; tap-again→Delete tracks + turn-off-track; double-tap-resets everywhere; Logic's floating mini-Fader overlay + meter bridge for portrait; dB-taper faders, equal-power pan, strip order gain→EQ→sends→pan→fader→meter; peak meters w/ numeric hold; named export presets (MP3 320 / WAV 16/44.1 / WAV 24 premium) + SATB stem export + Overload-Protection-Only default + one-knob "Master for streaming" (−14 LUFS-I/−1 dBTP); pinch-zoom + visible snap with auto resolution.
SKIP: armed-tool-mode primary paradigm; gesture-overloaded toggles; configurable pan law / pre-post sends / dither / numeric bitrates / 96kHz; rotary knobs (vertical swipe is the convention); multi-region split on phone widths.
