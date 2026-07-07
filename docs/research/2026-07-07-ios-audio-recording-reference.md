# iOS / WebKit Audio Recording — Engineering Reference (2026-07-07)

Compiled for the Part Tracks + Studio recording pipelines after a day of
production incidents (accompaniment silent during recording, Safari husk
takes, takes landing a measure late, iPhone capturing silence). Sources:
Apple developer docs + forums, WebKit blog/bugs, MDN, caniuse — cited
inline. Companions: [[2026-07-06-ios-audio-engineering-brief]] (mixing
graph), and the memory note `part-tracks-flatten-fix`.

**Read before touching capture, audio-session, or take-alignment code in
`src/components/partTracks/`, `src/lib/audio/`, or the native
`StudioEnginePlugin` / MusicKit plugins.**

---

## 1. AVAudioSession vs. Apple Music (MPMusicPlayerController)

### The core rule that bit us

`MPMusicPlayerController.applicationMusicPlayer` (and `.systemMusicPlayer`)
plays through the **Media Services** audio path and holds its own audio
session. Our app's `AVAudioSession` is a *separate* session that arbitrates
against it. Whichever session activates **last with a non-mixable category
wins**, and activating a `.playAndRecord` session **without**
`.mixWithOthers` deactivates (pauses) Apple Music. This is why starting
Music first and opening the mic second paused the backing the instant
recording began.

### What each piece does

- **`.playAndRecord`** — the only category that routes mic input *and*
  output simultaneously. **Default behavior interrupts other apps' audio.**
  (https://developer.apple.com/documentation/avfoundation/avaudiosession/category/1616568-playandrecord)
- **`.mixWithOthers`** — opts out of the interruption so your session
  coexists with others' audio. **Must be set as a category option at
  `setCategory(...)` time, before `setActive(true)`** — you cannot mix it
  in after the session is active. (Apple Developer Forums thread 713066:
  developers confirm the option is applied at category-set time; setting it
  late does nothing. https://developer.apple.com/forums/thread/713066)
- **`.duckOthers`** — lowers others' volume instead of silencing; not what
  we want (we want the backing at full level).
- **`.defaultToSpeaker`** — routes to the speaker when no headset is
  present; pairs with `.mixWithOthers` for hands-free monitoring.

### Ordering that keeps Apple Music alive (adopted 2026-07-07, PR #88/#89)

```
1. setCategory(.playAndRecord, options: [.mixWithOthers, .defaultToSpeaker])
2. setActive(true)                 // claim a mixable record session FIRST
3. MPMusicPlayerController...play() // Music starts INTO the mixed session
4. start AVAudioEngine capture
```

Claiming the mixable session **before** MusicKit playback is the
documented workaround; starting Music first and configuring the session
afterward is the failure mode. Our native `prepareExternalRecordSession`
now always passes `musicKitOwnsSession: false` and sets
`.playAndRecord + .mixWithOthers` regardless of backing kind.

### Known residual quirks (design defensively, keep the web fallback)

- **Returning from background re-interrupts.** Even with `.mixWithOthers`,
  coming back from background frequently stops the other app's playback.
  (Forums threads 713066, 125978 —
  https://developer.apple.com/forums/thread/125978)
- **`AVCaptureSession` steals the session.** If any camera/capture session
  is alive, set `automaticallyConfiguresApplicationAudioSession = false`
  or it silently reconfigures the session and defeats `.mixWithOthers`.
  (Forums thread 744216 —
  https://developer.apple.com/forums/thread/744216)
- **MPMusicPlayer is sticky.** Once it owns output, AVPlayer/engine audio
  chained after it can stop the music. (Forums thread 127163 —
  https://developer.apple.com/forums/thread/127163)
- **Always keep the fallback.** If the mixable-session claim still loses to
  Music on some device/OS, fall back to the web-capture path (WKWebView
  `getUserMedia`), which establishes its own session. That fallback is
  already wired in `startNativeRecordForTrack`'s start-failure catch.
- **Handle `AVAudioSession.interruptionNotification`.** Calls, Siri, and
  route changes interrupt the session; on `.ended` with `.shouldResume`,
  re-activate and restart. (Forums thread 663604 —
  https://developer.apple.com/forums/thread/663604)

---

## 2. Latency accounting — aligning a take to the backing

This is the root of "records a measure late." Total mic-to-grid offset has
three components; only the **hardware** part is a stable constant.

### The three components

1. **Startup gap** — wall-clock time between "capture went live" and
   "backing became audible." Dominated by `getUserMedia`/session
   activation and, for streaming backing, MusicKit's 0.5–2 s
   `setQueue+play` warm-up. **Varies per device and per session — must be
   MEASURED, never guessed.** (This was the bug: a fixed 700 ms guess vs a
   real 1.5–2.5 s gap ≈ one 4/4 measure at ~100 BPM.)
2. **Hardware round-trip** — mic ADC + output DAC + wireless transport.
   Read, don't assume:
   - `AVAudioSession.inputLatency` + `.outputLatency` (native), plus
     `.ioBufferDuration` for the buffer quantum.
     (https://developer.apple.com/documentation/avfaudio/avaudiosession)
   - Typical values: **built-in mic + speaker ~ a few ms each**; **wired
     ~ low-ms**; **Bluetooth/AirPods is the killer — 150–300 ms+ round
     trip**, and AirPods add their own variable transport delay. Treat any
     Bluetooth route as high-latency and prefer measured values.
3. **Scheduling anchor** — if you `start()` sources at
   `ctx.currentTime + 0.05` (our 50 ms grace), that 50 ms is part of the
   offset and must be included in the stamp.

### Native (AVAudioEngine) anchoring

Use sample-time, not wall-clock, for accuracy: `AVAudioTime` /
`lastRenderTime` gives the render clock; align the recorded buffer's start
sample against the player node's schedule sample. The engine's
`inputNode`/`outputNode` `presentationLatency` reflects the current route.
Recompute on `routeChangeNotification` — plugging in AirPods mid-session
changes every number above.

### Web (what we implement)

`computeTakeAlignment` in `src/lib/audio/takeAlignment.ts` measures the
startup gap from three `performance.now()` stamps (press / capture-live /
backing-audible) and adds a small configured hardware residual
(`studio.deviceLatencyMs`, default 150 ms). See §3 for why the residual is
manual on Safari.

---

## 3. WKWebView / Safari getUserMedia + MediaRecorder

### Record vs. decode codec matrix — the trap

Safari's `MediaRecorder` and its `decodeAudioData` do **not** support the
same formats, and `isTypeSupported` lies by omission:

| Format | Safari record (`MediaRecorder`) | Safari decode (`decodeAudioData`) | Chrome/FF |
|---|---|---|---|
| `audio/mp4;codecs=mp4a.40.2` (AAC) | ✅ | ✅ | ❌ record / ✅ decode |
| `audio/webm;codecs=opus` | ⚠️ *claims* support in 18.4+ but produces broken output | ❌ cannot decode | ✅ / ✅ |
| `audio/wav` | ❌ (dropped ~STP 117) | ✅ | ❌ / ✅ |

- WebKit's MediaRecorder officially supports **MP4 container + AAC audio**
  only; WebM/Opus is not a supported record format.
  (https://webkit.org/blog/11353/mediarecorder-api/)
- **Husk-blob failure (observed 2026-07-07):** Safari 18.4+ began
  *reporting* `isTypeSupported('audio/webm;codecs=opus') === true`, so a
  webm-first probe selected webm on Safari — and the recorder emitted a
  ~5-byte Matroska Cues fragment with no audio. **Rule: on Apple engines
  (`/apple/i.test(navigator.vendor)`), probe `audio/mp4` FIRST; webm only
  as a last resort.** (Our `orderRecorderMimeCandidates`.)
- **Guard against husks:** reject saved takes below ~1 KB — a header-only
  blob passes a `size > 0` check but is unplayable.
- **`audio/wav` MediaRecorder support was removed** in a Safari preview;
  don't rely on it. (audio-recorder-polyfill issue 83 —
  https://github.com/ai/audio-recorder-polyfill/issues/83)

### MediaStreamAudioSourceNode silence (the iPhone "records nothing" bug)

Routing capture through the Web Audio graph
(`MediaStreamAudioSourceNode → Tone.Recorder`) **silently produces silence
on iOS WebKit when the mic stream's sample rate differs from the
AudioContext's** (e.g. an AirPods mic at 24 kHz vs a 48 kHz context). The
source node yields silence and the take is empty.

**Rule: on the manual-getUserMedia path, record from the raw stream with a
plain `MediaRecorder` — do NOT route capture through Web Audio.** Keep the
Tone graph only for metering/waveform/monitor, which are cosmetic if they
break. (Our `sharedRecorder.ts` split.) Related WebKit Web Audio timing
bugs: 221334 (delayed/glitchy), 232728 (currentTime speeds up on
Bluetooth), 231105 (context stops in background) —
https://bugs.webkit.org/show_bug.cgi?id=221334 ,
https://bugs.webkit.org/show_bug.cgi?id=232728 ,
https://bugs.webkit.org/show_bug.cgi?id=231105

### AudioContext.outputLatency is Safari-18.4+ only

**`AudioContext.outputLatency` is unsupported in Safari/iOS before 18.4**
(added 18.4; Chrome 102+, Firefox 70+).
(https://caniuse.com/mdn-api_audiocontext_outputlatency) `baseLatency`
landed earlier (STP 113). **Implication:** our `getOutputLatencyMs()`
returns **0 on any iPad/iPhone below iOS 18.4**, so the output-latency term
of the trim is silently absent there — a real contributor to takes sitting
slightly late on older devices. On those, the measured startup gap +
`deviceLatencyMs` residual + the manual Earlier/Later nudge are the only
compensation. Consider bumping the Apple-engine default `deviceLatencyMs`
when `outputLatency` reads 0.

---

## 4. Latency compensation when outputLatency is unreported

Patterns web DAWs use (and which we now apply):

1. **Measure the startup gap per take** from timestamps rather than trust a
   fixed constant — the single biggest win (§2).
2. **Calibrate a device constant once** (loopback / clap test): play a
   click, record it, measure the offset between scheduled and captured
   sample — that difference is the round-trip to bake into
   `deviceLatencyMs`. Store per-device.
3. **Manual nudge as the escape hatch** — ±0.1 s take-offset buttons
   (shipped in PR #88) let the user zero out any residual the automatic
   path can't observe (exactly the pre-18.4 no-outputLatency case).
4. **Sample-accurate scheduling** — schedule all sources against one
   `AudioContext` clock anchor (never `setTimeout`) so relative alignment
   is deterministic even if the absolute offset needs trimming.
5. **Head-trim, don't shift, for fresh takes; shift, don't trim, for
   overdubs** — trimming audio that was never captured is impossible, so an
   overdub that opened late moves its clip start instead
   (`computeTakeAlignment` returns `clipStartOffsetSec` for that case).

---

## Quick decision table

| Symptom | Likely cause | Fix |
|---|---|---|
| Apple Music stops when recording starts | session claimed after Music, or no `.mixWithOthers` | claim `.playAndRecord + .mixWithOthers` BEFORE Music (§1) |
| iPhone take is empty / husk | capture routed through Web Audio (sample-rate silence) OR webm husk | raw-stream MediaRecorder; mp4-first probe; ≥1 KB guard (§3) |
| Take lands a measure late | fixed trim guess vs real startup gap | measure the gap per take (§2) |
| Take slightly late only on older iPad | `outputLatency` == 0 pre-18.4 | raise `deviceLatencyMs`; use nudge (§3, §4) |
| "Codec mismatch, can't play" on the recording device | recorded a format the device can't decode | mp4/AAC on Apple engines (§3) |

## Sources

- playAndRecord — https://developer.apple.com/documentation/avfoundation/avaudiosession/category/1616568-playandrecord
- AVAudioSession — https://developer.apple.com/documentation/avfaudio/avaudiosession
- mixWithOthers not applied late — https://developer.apple.com/forums/thread/713066
- MPMusicPlayer stickiness — https://developer.apple.com/forums/thread/127163
- Background re-interrupt — https://developer.apple.com/forums/thread/125978
- AVCaptureSession audio-session — https://developer.apple.com/forums/thread/744216
- Interruption handling — https://developer.apple.com/forums/thread/663604
- WebKit MediaRecorder (MP4/AAC only) — https://webkit.org/blog/11353/mediarecorder-api/
- audio/wav dropped — https://github.com/ai/audio-recorder-polyfill/issues/83
- outputLatency support (Safari 18.4+) — https://caniuse.com/mdn-api_audiocontext_outputlatency
- WebKit Web Audio bugs — https://bugs.webkit.org/show_bug.cgi?id=221334 , /232728 , /231105
- MDN outputLatency — https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency
