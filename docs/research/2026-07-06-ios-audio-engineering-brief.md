# iOS Native DAW Mixer/Mastering — Research Brief (2026-07-06)

Compiled for Studio DAW expansion sub-project B (Mixer & Mastering). Source: research agent sweep of Apple docs, WWDC sessions, and expert references. Cited URLs inline.

## 1. AVAudioEngine mixing graph

Per-track chain: `AVAudioPlayerNode → AVAudioUnitEQ (optional) → dynamics AVAudioUnitEffect (optional) → dedicated per-track AVAudioMixerNode → pre-master AVAudioMixerNode → master EQ → master compressor → custom look-ahead limiter → mainMixerNode/output`. Reference topology: Apple AVAEMixerSample (https://github.com/leecade/appleSample/blob/master/UsingAVAudioEngineforPlaybackMixingandRecording/AVAEMixerSample/AudioEngine.m).

- Dedicated mixer node per track → independent metering taps + mute/solo as `outputVolume = 0` without touching player-node gain.
- **Taper gotcha:** `AVAudioMixerNode.outputVolume` / `AVAudioMixing.volume` are LINEAR 0–1 (https://developer.apple.com/documentation/avfaudio/avaudiomixernode). Fader UI must convert: `linear = pow(10, dB/20)`. Unity at ~75–80% of fader travel via log taper. Can't exceed unity through this property — use `AVAudioUnitEQ.globalGain` (−96…+24 dB) for boost.
- `AVAudioMixing.pan` is −1…+1 per input bus, constant-power internally.
- `AVAudioUnitEQFilterParameters`: bandwidth in **OCTAVES not Q** (https://developer.apple.com/documentation/avfaudio/avaudiouniteqfilterparameters) — #1 web/native parity bug.
- Metering: `installTap` (one per bus; 512–1024 frames for UI meters), peak via `vDSP_maxmgv`, RMS via `vDSP_rmsqv`; dBFS = `20*log10(max(v,1e-9))`; hand-rolled ballistics (~10ms attack/~300ms release EMA). Real-time discipline: no locks/alloc/ObjC in taps (https://developer.audiob.us/doc/_good-_citizen.html).

## 2. Dynamics/limiting ranked

| Option | Verdict |
|---|---|
| `kAudioUnitSubType_DynamicsProcessor` (AVAudioUnitEffect) | Track-level gentle leveling only; combined comp/expander, coarse |
| `kAudioUnitSubType_PeakLimiter` | Cheap safety limiter; NOT look-ahead, transients can overshoot (https://developer.apple.com/documentation/audiotoolbox/kaudiounitsubtype_peaklimiter) |
| **Custom render-block look-ahead limiter** | **Recommended for master.** Delay line (1.5–5ms) + gain-reduction pre-computation; report latency via `AUAudioUnit.latency` (https://developer.apple.com/documentation/audiotoolbox/auaudiounit/latency). Design ref: https://www.kvraudio.com/forum/viewtopic.php?t=215793 |
| AUv3 hosting | Only for third-party plugin extensibility; async instantiation required (kAudioComponentFlag_RequiresAsyncInstantiation) |

DynamicsProcessor params: Threshold, HeadRoom, Expansion Ratio/Threshold, Attack, Release, MasterGain + read-only CompressionAmount for GR metering.

## 3. LUFS / EBU R128 / BS.1770 on iOS

- No Apple API. **Port/link libebur128 (C, MIT)** — K-weighting, gated blocks, true peak (https://github.com/jiixyj/libebur128).
- K-weighting = 2 biquads (high-shelf ~+4dB above ~1.5kHz + ~38Hz high-pass) via `vDSP_biquad`; coefficients in EBU R128 (https://tech.ebu.ch/docs/r/r128.pdf), recompute per sample-rate via bilinear transform.
- Gating: 400ms blocks 75% overlap → `-0.691 + 10*log10(meanSquare)`; absolute gate −70 LUFS then relative gate (mean − 10 LU); short-term = 3s window; momentary = 400ms ungated.
- True peak: 4× oversampled polyphase FIR (BS.1770 minimum; ±0.55dB worst case; 8× = ±0.14dB — https://www.fabfilter.com/help/pro-l/using/truepeaklimiting). Same oversampled buffer can feed limiter ceiling detection.
- CPU: trivial on A-series (single-digit % of one core).

## 4. Offline bounce

Canonical: `engine.enableManualRenderingMode(.offline, format:, maximumFrameCount: 4096)` BEFORE `engine.start()`, on the SAME graph as live playback; loop `manualRenderingBlock` into `AVAudioFile` (https://developer.apple.com/documentation/avfaudio/audio_engine/performing_offline_audio_processing). Pad render past end by limiter latency. Voice processing unavailable in manual rendering (WWDC19 session 510).

- Per-clip bounce: scratch engine with just that track's chain (cleaner than solo-state tricks).
- Compressed export: WAV/CAF native; AAC/m4a via `AVAssetExportSession` (preset AppleM4A) or `ExtAudioFile` for bitrate control (https://atastypixel.com/easy-aac-compressed-audio-conversion-on-ios/).
- **MP3: no system encoder.** LAME patents expired 2017-04 — shipping LAME is legally fine now (https://www.theregister.com/2017/05/16/mp3_dies_nobody_noticed/), just an engineering cost. Recommended: default WAV + AAC natively; web path already has lamejs for MP3.

## 5. Web ↔ native parity strategy (the hard part)

- EQ: Web Audio Q (dimensionless) vs AVAudioUnitEQ bandwidth (octaves): `1/Q = 2·sinh(ln(2)/2 · BW · ω₀/sin ω₀)`. Apple's `.parametric` is Butterworth-derived — subtly different at extreme Q/gain. RBJ cookbook: https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html
- Compressor attack/release: THREE different definitions — Web Audio spec (time to change gain 10dB — https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode), AU DynamicsProcessor (envelope time constant ~63%), custom (whatever we define). Never unify by name.
- **Strategy:** (1) one canonical platform-neutral parameter model saved in project files; (2) per-platform adapters with EMPIRICALLY derived conversion constants (render test signals through both, solve for scaling that overlays measured curves); (3) rendered-reference regression fixtures in CI: sine sweep + drum transient + full mix through both chains, diffed on LUFS + true-peak + spectral difference; (4) limiter parity = same LUFS/true-peak TARGETS on bounce (shared metering code), not bit-identical DSP.

## 6. AVAudioSession for DAW use

- `.playAndRecord` + `.default` mode (NOT `.measurement` — reduces input gain in practice, https://developer.apple.com/forums/thread/25197; never voiceChat modes — AGC/AEC hostile to music).
- `setPreferredSampleRate`/`setPreferredIOBufferDuration` only honored while session INACTIVE; re-read actuals after activation (QA1631). ~5ms IO buffer practical target; profile on minimum-supported device.
- Use `AVAudioSession.inputLatency`/`outputLatency` + tap timestamps for take alignment.
- Handle `routeChangeNotification`/`interruptionNotification` → re-fetch format, possibly restart engine.
