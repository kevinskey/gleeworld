# Browser DAW Mixing/Mastering/MP3 Export — Research Brief (2026-07-06)

For Studio DAW sub-project B. Adversarially-researched; URLs inline.

## Loudness (EBU R128 / BS.1770)
- Gating: 400ms blocks, 75% overlap; absolute gate −70 LUFS; relative gate = ungated mean − 10 LU; recompute over survivors = Integrated. Momentary = 400ms ungated; Short-term = 3s. LRA (EBU Tech 3342): −20 LU relative offset (DIFFERENT from integrated's −10 — bug source), 95th−10th percentile.
- K-weighting at 48kHz (BS.1770-4 tables): stage1 shelf b=[1.53512485958697, −2.69169618940638, 1.19839281085285] a=[−1.69065929318241, 0.73248077421585]; stage2 HP b=[1,−2,1] a=[−1.99004745483398, 0.99007225036621]. Other rates: derive via bilinear transform per libebur128 (f0=1681.97 Hz Q=0.70718 shelf; f0=38.135 Hz Q=0.50033 HP) — https://github.com/jiixyj/libebur128
- LK = −0.691 + 10·log10(Σ Gᵢ·zᵢ); surround G=1.41. True peak: 4× oversample, 48-tap polyphase FIR, +12.04 term (Annex 2).
- JS impls: `loudness-worklet` (MIT, AudioWorklet, claims ITU test-vector validation — verify) https://github.com/lcweden/loudness-worklet; or WASM-compile libebur128. Avoid `needles` (ScriptProcessor).
- Targets: Spotify −14 LUFS ≤−1 dBTP (primary: https://support.spotify.com/us/artists/article/loudness-normalization/; Loud/Normal/Quiet = −11/−14/−19); YouTube ≈−14 (consensus, no primary page); Apple ≈−16 (secondary only). NOTE (verified): Apple Sound Check and Spotify BOTH boost quiet material — never claim "only turns down". **Default target: −14 LUFS-I / −1 dBTP.**

## Mastering chain
- Order: EQ → gentle compression → limiter → (dither: moot for MP3). MP3 caution (SOS): ceiling −1 or lower; small peaks distort in encode.
- One-knob choir defaults: HPF 40–80Hz shallow; high-shelf +1–2dB @ ~8kHz; comp 2:1, 10ms/250ms, 2–3dB GR; limiter ceiling −1 dBTP (iZotope: −0.6…−0.8 pre-lossy).
- `DynamicsCompressorNode` limits (W3C): fixed 6ms lookahead, UNCONTROLLABLE auto makeup gain (^0.6 rule), peak detector, Chromium's 15-yr-old algorithm everywhere, no true-peak. Verdict: glue comp OK, NOT a mastering limiter. Tone.Limiter = same node (ratio 20) — insufficient.
- Custom AudioWorklet limiter required. Adapt: https://github.com/chrisguttandin/limiter-audio-worklet-processor (monotonic-deque sliding max, exp release) or https://github.com/robert8888/audio-limiter (5ms lookahead). Defaults: 3–5ms lookahead, 100–500ms release, −1 dBTP ceiling; true-peak sidechain needs manual 4× FIR upsampling (no worklet oversample property).
- BiquadFilterNode Q semantics differ per filter type (dB for LP/HP, linear for peaking) — clamp Q 0.1–10, gain ±15–20dB.

## MP3 encode
- Patents dead (2017). Use pinned `@breezystack/lamejs` 1.2.7 (upstream zhuker stale, npm 1.2.1 has MPEGMode bug). CBR only, mono/stereo, feed 1152-sample chunks of separate Int16Arrays, `flush()`, Blob type 'audio/mpeg'.
- Perf UNCERTAIN: claims 20× realtime; issues report ~1× (https://github.com/zhuker/lamejs/issues/44) — build progress UI, run in Worker.
- MediaRecorder can't do MP3 anywhere. ffmpeg.wasm overkill (31–65MB, SAB headers, iOS OOM history). Middle option: `wasm-media-encoders` (real LAME WASM, 66KB gz, VBR, no SAB) https://github.com/arseneyr/wasm-media-encoders.

## Offline rendering
- Prefer raw `OfflineAudioContext` over `Tone.Offline` (10–30× overhead, Tone #436; >30–120s render integrity issues #551; Safari NotSupportedError #662). Shared graph-builder parameterized by context = live/offline parity.
- Safari/WKWebView: OfflineAudioContext max 10ch, min 44.1k; AudioWorklet ≤6 input channels+AudioParams, channelCountMode 'explicit' (standardized-audio-context README). WebKit leaks: ConvolverNode #156624; ~2000 OfflineAudioContext instances crash #198964.
- MEMORY IS THE CONSTRAINT: stereo 44.1k f32 ≈ 21.2MB/min; 8-track 5-min ≈ ~530MB vs empirical iOS Safari OOM ~100–200MB (https://lapcatsoftware.com/articles/2026/1/7.html) + Capacitor WKProcessPool overhead (#6887) + NO memory-pressure signal (#6933). **Chunked rendering is mandatory on iOS**: 30–60s segments, dispose contexts, lead-in render for tail-state nodes, crossfade splice, persist chunks to IndexedDB (OOM kill is silent). Single-pass only below ~150–200MB projected.

## Prior art
- GridSound + openDAW: AGPL (no direct reuse; openDAW sells commercial licenses). Soundtrap UX pattern to copy: mastering auto-applied at export, audition preview, opt-out toggle, MP3 320/Ogg/WAV presets. web-synth: WASM-in-AudioWorklet pattern for heavy DSP. BandLab: reimplemented Web Audio natively on mobile for parity (precedent for our native-parity concern). **WAM 2.0 (MIT)** plugin standard + Wam-Studio host — worth shaping our mastering module as a WAM; no existing WAM limiter/LUFS module (build in-house regardless).

## Recommended stack
(a) Mixer: per-track Gain(fader dB-taper) → StereoPanner → Biquad EQ → bus gain; shared graph-builder for live+offline. (b) Master: HPF → shelf → DynamicsCompressor (glue) → custom worklet look-ahead limiter → libebur128-WASM LUFS/true-peak meter; default target −14 LUFS-I/−1 dBTP. (c) Export: OfflineAudioContext chunked render → worker MP3 (lamejs pinned or wasm-media-encoders) fed incrementally per chunk; WAV via existing encoder; IndexedDB progress persistence.
