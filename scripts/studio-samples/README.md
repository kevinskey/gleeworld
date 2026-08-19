# Studio premium-instrument sample pipeline

Build-time tooling (never bundled) that turns free/open-license sample
libraries into the velocity-layered MP3 + `manifest.json` sets streamed by
`src/lib/studio/engine/layeredSampler.ts`. Sources, licenses, and required
attributions are pinned in `SOURCES.json`; the user-facing credits live in
`CREDITS.md` and `public/studio-sound-credits.html`.

## Rebuild from scratch

```sh
# 1. Download the libraries in SOURCES.json into $SRC (one subdir per key).
# 2. Extract the FluidR3 choir preset (bank 0, program 52), loop-unrolled to 8s:
node extract-sf2.mjs "$SRC/fluidr3_gm/fluid-soundfont-3.1/FluidR3_GM.sf2" 0 52 \
  "$SRC/fluidr3_gm/extracted-choir" 8
# 3. Generate conversion recipes (encodes each library's layout conventions):
node build-recipes.mjs "$SRC" "$SRC/recipes.json"
# 4. Convert to MP3 160k + WebM/Opus 96k + manifests (requires ffmpeg
#    with libopus). Clients that can decode webm/opus fetch the ~40%
#    smaller .webm files; everyone else gets the .mp3s:
node convert.mjs "$SRC/recipes.json" "$SRC" "$OUT"
# 5. Upload $OUT to the glee-world Space under studio-samples/ with
#    public-read ACL + immutable cache headers (rclone on the droplet):
#    rclone copy $OUT :s3:glee-world/studio-samples \
#      --header-upload "Cache-Control: public, max-age=31536000, immutable"
```

⚠️ Because uploads are cached immutable for a year, a rebuild that changes
what an existing path MEANS (e.g. grand_piano's 2026-08 4→8 velocity-layer
bump re-defines `l0/`..`l3/`) must go to a FRESH Space folder, wired up via
the instrument's `dir` field in `src/lib/studio/gwInstruments.ts`
(`grand_piano` → `grand_piano_v2`). Purely additive uploads (new
instruments, new files) can reuse the folder.

Serving URL (CORS-enabled via the supabase.gleeworld.org nginx public-storage
proxy — plain Spaces URLs send no Access-Control-Allow-Origin):
`https://supabase.gleeworld.org/storage/v1/object/public/studio-samples/<name>/manifest.json`

## Gotchas encoded in build-recipes.mjs

- VSCO2 CE **section** folders are named an octave low (C1 = sounding C2);
  solo violin files are at true pitch. Offsets are set per folder.
- Salamander piano `rel<N>.flac` release samples map to MIDI note `20 + N`.
- MuldjordKit's SFZ uses its own key layout (48–66, piece order
  KdrumL..SnareRest2) and is remapped to GM drum notes; AVL kits are
  already GM-mapped.
- FluidR3 sample *names* are an octave off; the `originalPitch` field is
  correct (verified by autocorrelation) — trust the extractor's output names.
- Steel-string guitar was dropped: the only free option (FSS/FlameStudios)
  is GPL, whose copyleft is unsuitable for redistributing converted samples.
