// StudioEnginePlugin
//
// Capacitor bridge for the native StudioNativeEngine. JS calls one of
// the exposed methods; results return via Promise, and continuous
// state (position tick) streams back via `notifyListeners`.
//
// Methods (matching the TS bridge in src/lib/studio/engine/nativeBridge.ts):
//
//   start({ })                            → starts AVAudioSession + engine
//   loadSession({ session, assetUrls })   → parse manifest + warm assets
//   play() / pause() / stop()             → transport
//   seek({ seconds })                     → jump
//   updateStrip({ trackId, volumeDb?, pan?, mute? })
//   updateTempo({ bpm })
//   recordStart() / recordStop()          → returns local file URL
//   mixdown()                             → returns local file URL
//
// Events:
//
//   "state" → { isReady, isPlaying, positionSeconds, tempoBpm }

import Foundation
import AVFoundation
import Capacitor

// ── Structured error shape (returned by every plugin method) ──────────────
// Kept in this file (not a separate source) because the Xcode project uses
// manual file references; a new .swift wouldn't be in Compile Sources.
public struct StudioError: Error {
    public let code: String        // stable machine code, e.g. "ENGINE_NOT_READY"
    public let message: String
    public let operation: String   // the plugin method that failed
    public var trackId: String?
    public var effectId: String?
    public var recoverable: Bool

    public init(code: String, message: String, operation: String,
                trackId: String? = nil, effectId: String? = nil, recoverable: Bool = true) {
        self.code = code; self.message = message; self.operation = operation
        self.trackId = trackId; self.effectId = effectId; self.recoverable = recoverable
    }
    public var dict: [String: Any] {
        var d: [String: Any] = ["code": code, "message": message,
                                "operation": operation, "recoverable": recoverable]
        if let t = trackId { d["trackId"] = t }
        if let e = effectId { d["effectId"] = e }
        return d
    }
}

public extension CAPPluginCall {
    func reject(_ e: StudioError) { self.reject(e.message, e.code, nil, e.dict) }
}

// ── Discrete engine event names (see Engine.onEvent) ──────────────────────
public enum StudioEvents {
    public static let ready = "studioEngineReady"
    public static let error = "studioEngineError"
    public static let playbackStarted = "playbackStarted"
    public static let playbackPaused = "playbackPaused"
    public static let playbackStopped = "playbackStopped"
    public static let positionChanged = "playbackPositionChanged"
    public static let trackLoaded = "trackLoaded"
    public static let trackFailed = "trackFailed"
    public static let effectAdded = "effectAdded"
    public static let effectRemoved = "effectRemoved"
    public static let effectBypassed = "effectBypassed"
    public static let effectParameterChanged = "effectParameterChanged"
    public static let routeChanged = "routeChanged"
    public static let audioInterrupted = "audioInterrupted"
    public static let engineRecovered = "engineRecovered"
}

@objc(StudioEnginePlugin)
public class StudioEnginePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StudioEnginePlugin"
    public let jsName = "StudioEngine"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopEngine", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateStrip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setFxParam", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "bypassEffect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateTempo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMetronome", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clickOnce", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveFinalizedTake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareRecordSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordWithCountIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordStop", returnType: CAPPluginReturnPromise),
        // External-source coexistence record mode (Part Tracks). Additive,
        // fully separate from the Studio record path above — runs on a
        // DEDICATED AVAudioEngine so Studio's exclusive-focus design and
        // its recorder are never touched. See ExternalRecorder.swift.
        CAPPluginMethod(name: "prepareExternalRecordSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "externalRecordStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "externalRecordStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "externalRecordSelfTest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mixdown", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addClipToTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeClipFromTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHardwareLatencyMs", returnType: CAPPluginReturnPromise),
        // Task 5 (headphone/bleed guard): current AVAudioSession output
        // route, so the record flow can warn when a backing track will
        // bleed into an open mic (speakers, not headphones) with echo
        // cancellation off. Additive — read-only, doesn't touch the
        // session. See TS-side classifyRouteOutputs in
        // src/plugins/studioEngine.ts for the unit-tested mirror of the
        // classification below.
        CAPPluginMethod(name: "getAudioRoute", returnType: CAPPluginReturnPromise),
        // API-shape aliases — flatter parameters, linear-volume input,
        // separate "latencyMs" return key. These delegate to the same
        // engine internals as the canonical methods above; supporting
        // both shapes keeps the JS bridge call sites flexible.
        CAPPluginMethod(name: "updateTrackVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "injectNewClip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHardwareLatency", returnType: CAPPluginReturnPromise),
        // Pull-renderer A/B toggle. When ON, addClipToTrack decodes via
        // StudioAudioConverter on a background queue and routes the
        // resulting PCM buffer through TrackBinding.pullRenderer's
        // AVAudioSourceNode render block (lock-free mix). Default OFF
        // keeps the AVAudioPlayerNode push path active.
        CAPPluginMethod(name: "setPullRendererEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isPullRendererEnabled", returnType: CAPPluginReturnPromise),
        // Eager pre-warm of asset buffers — matches Logic / Pro Tools
        // session-open behavior. Decodes every asset to Float32 PCM in
        // the background so the first Play has zero disk I/O on the
        // audio thread.
        CAPPluginMethod(name: "prewarmAssets", returnType: CAPPluginReturnPromise),
    ]

    // Every heavy-init thing is lazy. The plugin instance is created at
    // app launch via MainViewController.capacitorDidLoad — anything
    // touched here runs before any JS or audio session exists.
    private lazy var engine = StudioNativeEngine()
    private lazy var assetLoader = AssetLoader()
    private lazy var recorder: StudioNativeRecorder = {
        let r = StudioNativeRecorder(engine: engine.avEngine)
        r.onPeak = { [weak self] db in
            // Capacitor's notifyListeners is main-thread-only and the
            // peak timer fires on the main run loop already, so a
            // direct call is safe. Wrap Float as Double for JS — NSNumber
            // bridges cleanly that way.
            self?.notifyListeners("recordPeak", data: ["db": Double(db)])
        }
        return r
    }()

    // External-source coexistence recorder — dedicated AVAudioEngine,
    // never shares state with `engine`/`recorder` above. Peaks stream on a
    // SEPARATE 'externalRecordPeak' event so Part Tracks JS subscribes
    // cleanly without colliding with Studio's 'recordPeak' listener.
    private var externalRecorder: ExternalRecorder?

    // Capacitor 7 calls `load()` automatically on plugins discovered via
    // `CAPBridgedPlugin`. For plugins added via `registerPluginInstance`
    // (which is what MainViewController.capacitorDidLoad does) we have
    // seen the auto-load contract miss in some lifecycle orderings —
    // engine.onState then stays nil and every emit() is a no-op, which
    // shows up as "audio plays but no state events reach JS". To make
    // wiring deterministic we (a) gate setup behind a flag and (b) call
    // it from every public entry point that touches the engine. The
    // operation is idempotent: only the first call assigns onState.
    private var didWireEngineEvents = false

    private func wireEngineEvents() {
        if didWireEngineEvents { return }
        didWireEngineEvents = true
        engine.onState = { [weak self] state in
            // `notifyListeners` writes through the Capacitor bridge,
            // which expects to be touched on the main thread. The
            // engine emits from a Timer on RunLoop.main today, but
            // we also emit from places like setMetronome() which run
            // on arbitrary queues — always hop to main here so it's
            // safe regardless of caller.
            var payload: [String: Any] = [
                "isReady": state.isReady,
                "isPlaying": state.isPlaying,
                "positionSeconds": state.positionSeconds,
                "tempoBpm": state.tempoBpm,
                "metronomeOn": state.metronomeOn,
            ]
            if let err = state.lastError, !err.isEmpty {
                payload["lastError"] = err
            }
            if Thread.isMainThread {
                self?.notifyListeners("state", data: payload)
            } else {
                DispatchQueue.main.async {
                    self?.notifyListeners("state", data: payload)
                }
            }
        }
        // Discrete named events (playbackStarted, audioInterrupted, …). Always
        // deliver on the main thread — notifyListeners touches the bridge.
        engine.onEvent = { [weak self] name, payload in
            if Thread.isMainThread {
                self?.notifyListeners(name, data: payload)
            } else {
                DispatchQueue.main.async { self?.notifyListeners(name, data: payload) }
            }
        }
    }

    public override func load() {
        wireEngineEvents()
        // Env-gated self-test (set GLEE_EXTERNAL_RECORD_SELFTEST=1 in the
        // Xcode scheme's Run > Arguments > Environment Variables). Runs the
        // external-record cycle + Studio's prepareRecordSession back-to-back
        // to prove no cross-contamination. Debug builds only.
        #if DEBUG
        if ProcessInfo.processInfo.environment["GLEE_EXTERNAL_RECORD_SELFTEST"] == "1" {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                self?.runExternalRecordSelfTest { summary in
                    NSLog("[ExternalRecorder][selftest] DONE \(summary)")
                }
            }
        }
        #endif
    }

    @objc func start(_ call: CAPPluginCall) {
        wireEngineEvents()
        do {
            try engine.start()
            call.resolve()
        } catch {
            call.reject("Engine start failed: \(error.localizedDescription)")
        }
    }

    @objc func stopEngine(_ call: CAPPluginCall) {
        wireEngineEvents()
        engine.stopEngine()
        assetLoader.clearCache()
        call.resolve()
    }

    @objc func loadSession(_ call: CAPPluginCall) {
        wireEngineEvents()
        guard let sessionDict = call.getObject("session") else {
            call.reject("missing session payload"); return
        }
        let assetUrls = call.getObject("assetUrls") as? [String: String] ?? [:]
        assetLoader.setUrls(assetUrls)
        do {
            let data = try JSONSerialization.data(withJSONObject: sessionDict, options: [])
            let parsed = try Studio.decode(data)
            Task {
                do {
                    try await engine.loadSession(parsed, assetLoader: assetLoader)
                    call.resolve()
                } catch {
                    call.reject("loadSession failed: \(error.localizedDescription)")
                }
            }
        } catch {
            call.reject("session JSON invalid: \(error.localizedDescription)")
        }
    }

    // Transport ops run on the main thread because they schedule
    // `Timer.scheduledTimer` (position tick, metronome, MIDI notes).
    // Timers added to the current thread's run loop don't fire when the
    // method runs on Capacitor's background plugin queue — without
    // hopping to main, isPlayingNow flips true but the position never
    // emits, so the UI shows the play button stuck and the timeline
    // frozen at 0.
    @objc func play(_ call: CAPPluginCall) {
        wireEngineEvents()
        // Temporary diagnostic — proves the JS → Native → JS round-trip
        // is alive even if the engine's own emit chain is silent. Safe
        // to leave in place: the React state mapper ignores unknown
        // payload keys, and this fires once per play() call. Remove
        // after we confirm events flow.
        notifyListeners("state", data: ["status": "debug-play-called"])
        DispatchQueue.main.async { [weak self] in
            self?.engine.play()
            call.resolve()
        }
    }
    @objc func pause(_ call: CAPPluginCall) {
        wireEngineEvents()
        DispatchQueue.main.async { [weak self] in
            self?.engine.pause()
            call.resolve()
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        wireEngineEvents()
        DispatchQueue.main.async { [weak self] in
            self?.engine.stopTransport()
            call.resolve()
        }
    }

    @objc func seek(_ call: CAPPluginCall) {
        wireEngineEvents()
        let s = call.getDouble("seconds") ?? 0
        DispatchQueue.main.async { [weak self] in
            self?.engine.seek(toSeconds: s)
            call.resolve()
        }
    }

    @objc func updateStrip(_ call: CAPPluginCall) {
        wireEngineEvents()
        guard let trackId = call.getString("trackId") else { call.reject("missing trackId"); return }
        engine.updateTrackStrip(
            id: trackId,
            volumeDb: call.getDouble("volumeDb"),
            pan: call.getDouble("pan"),
            mute: call.getBool("mute"),
            solo: call.getBool("solo"))
        call.resolve()
    }

    // Live FX-parameter update. `trackId` omitted → master bus. `fx` is the
    // full updated FxNode JSON (id/type/enabled/params); the engine applies
    // the param values to the existing node without a rebuild.
    @objc func setFxParam(_ call: CAPPluginCall) {
        wireEngineEvents()
        guard let fxDict = call.getObject("fx") else { call.reject("missing fx"); return }
        let trackId = call.getString("trackId")
        do {
            let data = try JSONSerialization.data(withJSONObject: fxDict, options: [])
            let spec = try JSONDecoder().decode(Studio.FxNode.self, from: data)
            engine.setFxParam(trackId: trackId, spec: spec)
            call.resolve()
        } catch {
            call.reject("setFxParam decode failed: \(error.localizedDescription)")
        }
    }

    // Live enable/disable of an effect (bypass flip). `trackId` omitted →
    // master bus. Emits effectBypassed.
    @objc func bypassEffect(_ call: CAPPluginCall) {
        wireEngineEvents()
        guard let effectId = call.getString("effectId") else {
            return call.reject(StudioError(code: "BAD_ARGS", message: "effectId required",
                                           operation: "bypassEffect", recoverable: false)) }
        let trackId = call.getString("trackId")
        let bypassed = call.getBool("bypassed") ?? false
        let ok = engine.bypassEffect(trackId: trackId, fxId: effectId, bypassed: bypassed)
        if !ok {
            return call.reject(StudioError(code: "FX_NOT_FOUND",
                message: "effect \(effectId) not found on \(trackId ?? "master")",
                operation: "bypassEffect", trackId: trackId, effectId: effectId)) }
        var payload: [String: Any] = ["effectId": effectId, "bypassed": bypassed]
        if let t = trackId { payload["trackId"] = t }
        notifyListeners(StudioEvents.effectBypassed, data: payload)
        call.resolve()
    }

    @objc func updateTempo(_ call: CAPPluginCall) {
        wireEngineEvents()
        let bpm = call.getDouble("bpm") ?? 120
        engine.updateTempo(bpm: bpm)
        call.resolve()
    }

    @objc func setMetronome(_ call: CAPPluginCall) {
        wireEngineEvents()
        // `on` is OPTIONAL: volume-only calls must not touch the toggle.
        // The old `?? false` default meant a volume-slider drag (which
        // sent on:true from JS) or any partial payload could silently
        // flip the metronome state out from under the user.
        let on = call.getBool("on")
        let db = call.getDouble("volumeDb")
        DispatchQueue.main.async { [weak self] in
            if let db = db { self?.engine.setMetronomeVolume(db: db) }
            if let on = on { self?.engine.setMetronome(on: on) }
            call.resolve()
        }
    }

    @objc func clickOnce(_ call: CAPPluginCall) {
        wireEngineEvents()
        let accent = call.getBool("accent") ?? false
        DispatchQueue.main.async { [weak self] in
            self?.engine.clickOnce(accent: accent)
            call.resolve()
        }
    }

    /// Persist a finalized (latency-trimmed) take from JS into the app's
    /// tmp dir and return a file:// URL the native engine can read.
    /// The JS recording flow previously cached a WebView-only blob: URL
    /// for fresh takes — AVAudioFile can't open those, so every take was
    /// silently absent from playback until the studio was reopened.
    /// Flip the AVAudioSession into the recorder's category AHEAD of
    /// time (the editor calls this before the count-in). On hardware the
    /// .playAndRecord transition takes 100-500 ms; when it happened
    /// inside recordStart — between count-in and beat 1 — the metronome
    /// grid started audibly late on recording runs. Same options as
    /// Recorder.start(), which then sees the category already set and
    /// skips the transition.
    @objc func prepareRecordSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let session = AVAudioSession.sharedInstance()
            do {
                // Guard on category AND mode. An external-coexistence take
                // (prepareExternalRecordSession) leaves the session in
                // .playAndRecord/.videoRecording — a category-only guard
                // would skip setCategory here and Studio would record in
                // .videoRecording mode. Pure-Studio flows arrive as either
                // not-.playAndRecord or .playAndRecord/.default, so this
                // widened guard changes nothing for them (the Global
                // Constraint on Studio's behavior is preserved).
                if session.category != .playAndRecord || session.mode != .default {
                    try session.setCategory(.playAndRecord, mode: .default,
                                            options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
                }
                try session.setActive(true)
                call.resolve()
            } catch {
                call.reject("prepareRecordSession failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func saveFinalizedTake(_ call: CAPPluginCall) {
        guard let b64 = call.getString("base64") else {
            call.reject("base64 required"); return
        }
        let filename = call.getString("filename") ?? "take-\(Int(Date().timeIntervalSince1970)).wav"
        DispatchQueue.global(qos: .userInitiated).async {
            guard let data = Data(base64Encoded: b64) else {
                call.reject("base64 decode failed"); return
            }
            let dir = FileManager.default.temporaryDirectory
                .appendingPathComponent("studio-takes", isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                let url = dir.appendingPathComponent(filename)
                try data.write(to: url, options: .atomic)
                call.resolve(["localUrl": url.absoluteString])
            } catch {
                call.reject("write failed: \(error.localizedDescription)")
            }
        }
    }

    /// Count-in + recorder + transport on ONE native clock. Resolves at
    /// grid start (recorder rolling, transport playing) so JS can stamp
    /// its waveform timeline. The recorder is fully prepared BEFORE the
    /// count-in begins; the grid-start callback only pays for
    /// AVAudioRecorder.record().
    @objc func recordWithCountIn(_ call: CAPPluginCall) {
        wireEngineEvents()
        let beats = call.getInt("countInBeats") ?? 0
        let secondsPerBeat = call.getDouble("secondsPerBeat") ?? 0.5
        let beatsPerBar = call.getInt("beatsPerBar") ?? 4
        let session = AVAudioSession.sharedInstance()
        let proceed: () -> Void = { [weak self] in
            DispatchQueue.main.async {
                guard let self else { call.reject("plugin gone"); return }
                do {
                    try self.recorder.prepare()
                } catch {
                    call.reject("record prepare failed: \(error.localizedDescription)")
                    return
                }
                self.engine.playWithCountIn(beats: beats, secondsPerBeat: secondsPerBeat,
                                            beatsPerBar: beatsPerBar,
                                            onCancelled: {
                                                call.reject("count-in cancelled")
                                            }) { [weak self] in
                    guard let self else { return }
                    do {
                        try self.recorder.startPrepared()
                        self.engine.recordingActive = true
                        call.resolve(["gridStartedAtMs": Date().timeIntervalSince1970 * 1000])
                    } catch {
                        call.reject("record start failed: \(error.localizedDescription)")
                    }
                }
            }
        }
        switch session.recordPermission {
        case .granted: proceed()
        case .denied: call.reject("Microphone permission denied. Enable it in Settings → GleeWorld.")
        case .undetermined:
            session.requestRecordPermission { granted in
                if granted { proceed() } else { call.reject("Microphone permission denied.") }
            }
        @unknown default: call.reject("Microphone permission state unknown.")
        }
    }

    @objc func recordStart(_ call: CAPPluginCall) {
        wireEngineEvents()
        // Resolve mic permission FIRST, asynchronously via the
        // completion-handler API. The previous version blocked on a
        // semaphore for the alert, which deadlocked the watchdog
        // because the alert presentation has to run on the main thread.
        let session = AVAudioSession.sharedInstance()
        let proceed: () -> Void = { [weak self] in
            DispatchQueue.main.async {
                guard let self else { call.reject("plugin gone"); return }
                do {
                    try self.recorder.start()
                    self.engine.recordingActive = true
                    call.resolve()
                } catch {
                    call.reject("record start failed: \(error.localizedDescription)")
                }
            }
        }
        switch session.recordPermission {
        case .granted:
            proceed()
        case .denied:
            call.reject("Microphone permission denied. Enable it in Settings → GleeWorld.")
        case .undetermined:
            session.requestRecordPermission { granted in
                if granted {
                    proceed()
                } else {
                    call.reject("Microphone permission denied.")
                }
            }
        @unknown default:
            call.reject("Microphone permission state unknown.")
        }
    }

    @objc func recordStop(_ call: CAPPluginCall) {
        wireEngineEvents()
        engine.recordingActive = false
        guard let url = recorder.stop() else { call.reject("not recording"); return }
        // Return the local file path the JS layer reads + uploads.
        call.resolve(["localUrl": url.absoluteString, "filename": url.lastPathComponent])
    }

    // MARK: - External-source coexistence record mode (Part Tracks)
    //
    // These four methods let Part Tracks capture the mic OVER an external
    // backing source (Apple Music / YouTube / uploaded file) that keeps
    // playing. They are ADDITIVE and independent of the Studio record path
    // above: capture runs on a dedicated AVAudioEngine (ExternalRecorder),
    // so `engine`, `recorder`, and Studio's exclusive-focus session design
    // are never touched. The AVAudioSession is configured here (or
    // deliberately left alone when MusicKit owns it), matching the proven
    // AudioSessionConfigPlugin recipe.

    /// Configure the AVAudioSession for coexistence recording — UNLESS
    /// MusicKit (MPMusicPlayerController) owns it, in which case we touch
    /// nothing (any category change, even .mixWithOthers, interrupts its
    /// playback per the PartTracksStudio guard). Either way we allocate a
    /// fresh dedicated recorder so externalRecordStart is ready to roll.
    /// Resolves { sessionConfigured } so JS knows whether the session was
    /// reconfigured.
    @objc func prepareExternalRecordSession(_ call: CAPPluginCall) {
        let musicKitOwnsSession = call.getBool("musicKitOwnsSession") ?? false
        // mixWithOthers is accepted for API symmetry / future use; the
        // proven recipe always sets .mixWithOthers when we own the session,
        // and never touches it when MusicKit does.
        _ = call.getBool("mixWithOthers") ?? true
        DispatchQueue.main.async { [weak self] in
            guard let self else { call.reject("plugin gone"); return }
            // Fresh recorder each prepare; tear down any prior one so a
            // prepare after an abandoned take can't leave a live tap.
            //
            // N2: a prepare arriving while a PRIOR start is still in flight
            // (capturing, or arming through its count-in) must SETTLE that
            // call's promise, not silently drop it. teardown() drains the
            // pending start WITHOUT firing onError, which would hang the
            // earlier externalRecordStart forever. stop() settles it first
            // ("capture stopped before it started"), then we replace.
            if let existing = self.externalRecorder, existing.isCapturing || existing.isArming {
                _ = existing.stop()
            } else {
                self.externalRecorder?.teardown()
            }
            let rec = ExternalRecorder()
            rec.onPeak = { [weak self] db in
                self?.notifyListeners("externalRecordPeak", data: ["db": Double(db)])
            }
            self.externalRecorder = rec

            if musicKitOwnsSession {
                // Do NOTHING to the AVAudioSession — MPMusicPlayerController
                // owns it. Internal recorder state is prepared; the session
                // stays exactly as MusicKit left it.
                NSLog("[ExternalRecorder] prepare: musicKitOwnsSession → session untouched")
                call.resolve(["sessionConfigured": false])
                return
            }

            let session = AVAudioSession.sharedInstance()
            do {
                // Mirror AudioSessionConfigPlugin's proven recipe: the
                // .videoRecording mode disables the speech DSP (echo
                // cancel / NS / AGC) that muddies vocals while still
                // letting background media (YouTube/WebView/uploaded) play.
                try session.setCategory(
                    .playAndRecord,
                    mode: .videoRecording,
                    options: [.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP]
                )
                // Best-effort preferred format (iOS honors when it can) —
                // same values Part Tracks relies on today.
                try? session.setPreferredSampleRate(48_000.0)
                try? session.setPreferredInputNumberOfChannels(1)
                try? session.setPreferredIOBufferDuration(0.005)
                // No options on setActive(true): .notifyOthersOnDeactivation
                // is a DEACTIVATION-only flag — passing it to an activation
                // throws an OSStatus error (see Engine.swift:170-174, where
                // that exact mistake silently killed engine.start on
                // builds 91/92).
                try session.setActive(true)
                NSLog("[ExternalRecorder] prepare: session=.playAndRecord/.videoRecording active")
                call.resolve(["sessionConfigured": true])
            } catch {
                call.reject("prepareExternalRecordSession failed: \(error.localizedDescription)")
            }
        }
    }

    /// Run the native count-in, then start capturing the mic to a WAV file
    /// on the dedicated engine. Resolves AFTER the count-in completes and
    /// capture is rolling, with { startedAtEpochMs, hardwareLatencyMs }.
    @objc func externalRecordStart(_ call: CAPPluginCall) {
        let countInBeats = call.getInt("countInBeats") ?? 0
        let secondsPerBeat = call.getDouble("secondsPerBeat") ?? 0.5
        let clickVolume = Float(call.getDouble("clickVolume") ?? 0.7)
        let session = AVAudioSession.sharedInstance()

        let proceed: () -> Void = { [weak self] in
            DispatchQueue.main.async {
                guard let self else { call.reject("plugin gone"); return }
                // Lazily create a recorder if prepare wasn't called (e.g.
                // MusicKit path that skipped session config). Never touches
                // the session here — prepare owns that decision.
                let rec = self.externalRecorder ?? {
                    let r = ExternalRecorder()
                    r.onPeak = { [weak self] db in
                        self?.notifyListeners("externalRecordPeak", data: ["db": Double(db)])
                    }
                    self.externalRecorder = r
                    return r
                }()
                // Reject double-start during the count-in too (isArming):
                // a second start mid-pre-roll would otherwise leak a hung
                // Capacitor call and tear the live take's engine state.
                guard !rec.isCapturing && !rec.isArming else {
                    call.reject("external record already in progress")
                    return
                }
                let latencyMs = session.inputLatency + session.outputLatency + session.ioBufferDuration
                rec.start(
                    countInBeats: countInBeats,
                    secondsPerBeat: secondsPerBeat,
                    clickVolume: clickVolume,
                    onStarted: { epochMs in
                        call.resolve([
                            "startedAtEpochMs": epochMs,
                            "hardwareLatencyMs": latencyMs * 1000.0,
                        ])
                    },
                    onError: { message in
                        call.reject("externalRecordStart failed: \(message)")
                    }
                )
            }
        }

        switch session.recordPermission {
        case .granted: proceed()
        case .denied: call.reject("Microphone permission denied. Enable it in Settings → GleeWorld.")
        case .undetermined:
            session.requestRecordPermission { granted in
                if granted { proceed() } else { call.reject("Microphone permission denied.") }
            }
        @unknown default: call.reject("Microphone permission state unknown.")
        }
    }

    /// Stop the dedicated capture, close the WAV, and resolve with a
    /// file:// URI (readable via Capacitor Filesystem) + duration.
    @objc func externalRecordStop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { call.reject("plugin gone"); return }
            guard let rec = self.externalRecorder, rec.isCapturing || rec.isArming else {
                call.reject("not recording")
                return
            }
            // N1: a stop during the count-in (isArming, capture not yet
            // rolling) must CANCEL cleanly. rec.stop() settles the still-
            // pending externalRecordStart ("capture stopped before it
            // started") and returns nil. Reject with a DISTINCT message so JS
            // treats this as a user cancel (no error toast) rather than a
            // failed take — without this the guard rejected outright and the
            // count-in's pending start rolled on into a live recording.
            if !rec.isCapturing {
                _ = rec.stop()
                call.reject("cancelled during count-in")
                return
            }
            guard let result = rec.stop() else {
                call.reject("external record stop produced no file")
                return
            }
            call.resolve([
                "fileUri": result.url.absoluteString,
                "durationSec": result.durationSec,
            ])
        }
    }

    /// Env-gated debug self-test — exercises the full external-record
    /// cycle, logs file size + latency, then runs Studio's own
    /// prepareRecordSession path to prove no cross-contamination. Also
    /// callable directly from JS for manual verification on a device.
    /// Debug builds only — rejects in release.
    @objc func externalRecordSelfTest(_ call: CAPPluginCall) {
        #if DEBUG
        runExternalRecordSelfTest { summary in
            call.resolve(summary)
        }
        #else
        call.reject("externalRecordSelfTest is only available in Debug builds")
        #endif
    }

    @objc func mixdown(_ call: CAPPluginCall) {
        wireEngineEvents()
        guard let session = engine.session else { call.reject("no session loaded"); return }
        do {
            let url = try StudioMixdown.render(engine: engine.avEngine, session: session)
            // After mixdown the engine left manual-rendering mode — caller
            // must call start()+loadSession() to resume normal playback.
            call.resolve(["localUrl": url.absoluteString, "filename": url.lastPathComponent])
        } catch {
            call.reject("mixdown failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Incremental clip splicing
    //
    // Used by useStudio's diff path so a fresh recording lands on the
    // engine without a full loadSession() teardown. The JS side resolves
    // the asset to a local-fetchable URL first, then asks us to attach
    // a single AVAudioPlayerNode for the new clip.

    @objc func addClipToTrack(_ call: CAPPluginCall) {
        guard let trackId = call.getString("trackId") else { call.reject("trackId required"); return }
        guard let clipDict = call.getObject("clip") else { call.reject("clip object required"); return }
        guard let localUrlOrPath = call.getString("localUrl") ?? call.getString("localFilePath") else {
            call.reject("localUrl / localFilePath required"); return
        }
        // The JS side may hand us a capacitor:// URL (after convertFileSrc)
        // OR a raw file:// path. Normalize to a real on-disk path because
        // AVAudioFile(forReading:) wants file:// or a path string.
        let localPath: String
        if let url = URL(string: localUrlOrPath), url.isFileURL {
            localPath = url.path
        } else if localUrlOrPath.hasPrefix("/") {
            localPath = localUrlOrPath
        } else {
            // Strip capacitor:// scheme + the _capacitor_file_ rewrite.
            let stripped = localUrlOrPath
                .replacingOccurrences(of: "capacitor://localhost/_capacitor_file_", with: "")
                .replacingOccurrences(of: "capacitor://localhost", with: "")
            localPath = stripped
        }
        do {
            let data = try JSONSerialization.data(withJSONObject: clipDict, options: [])
            let clip = try JSONDecoder().decode(Studio.AudioClip.self, from: data)
            engine.addClipToTrack(trackId: trackId, clip: clip, localFilePath: localPath)
            call.resolve()
        } catch {
            call.reject("clip JSON invalid: \(error.localizedDescription)")
        }
    }

    @objc func removeClipFromTrack(_ call: CAPPluginCall) {
        guard let trackId = call.getString("trackId") else { call.reject("trackId required"); return }
        guard let clipId = call.getString("clipId") else { call.reject("clipId required"); return }
        engine.removeClipFromTrack(trackId: trackId, clipId: clipId)
        call.resolve()
    }

    @objc func getHardwareLatencyMs(_ call: CAPPluginCall) {
        call.resolve(["ms": engine.getHardwareLatencyMs()])
    }

    /// Task 5 (headphone/bleed guard): report the current AVAudioSession
    /// output route. Read-only — never reconfigures or activates the
    /// session, so it's safe to call from either the Studio or the
    /// external-record (Part Tracks) path, MusicKit-owned or not.
    ///
    /// `outputs` are the raw `AVAudioSession.Port` rawValues for every
    /// port in `currentRoute.outputs` (usually one, but AirPlay / wired +
    /// Bluetooth simultaneous routes can report more than one).
    /// `isHeadphones` is true when ANY of those ports is a private-
    /// listening port (wired headphones, a Bluetooth headset/earbuds/
    /// speaker-in-hand, USB audio, or CarPlay/car audio) — built-in
    /// speaker/receiver and anything unrecognized read as false, the
    /// conservative choice for a bleed warning.
    @objc func getAudioRoute(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        let outputs = session.currentRoute.outputs
        let headphoneIshPorts: Set<AVAudioSession.Port> = [
            .headphones, .bluetoothA2DP, .bluetoothHFP, .bluetoothLE, .usbAudio, .carAudio,
        ]
        let isHeadphones = outputs.contains { headphoneIshPorts.contains($0.portType) }
        call.resolve([
            "outputs": outputs.map { $0.portType.rawValue },
            "isHeadphones": isHeadphones,
        ])
    }

    // MARK: - API-shape aliases

    /// Linear-volume strip update. AVAudioMixerNode.outputVolume is
    /// 0..1 linear gain; this method takes it directly and converts to
    /// dB internally so it routes through the same updateTrackStrip
    /// path as the canonical updateStrip method.
    @objc func updateTrackVolume(_ call: CAPPluginCall) {
        guard let trackId = call.getString("trackId") else { call.reject("trackId required"); return }
        guard let v = call.getFloat("volume") else { call.reject("volume required"); return }
        let clamped = max(Float(0.0001), min(Float(2.0), v))
        let db = 20.0 * log10(Double(clamped))
        engine.updateTrackStrip(id: trackId, volumeDb: db, pan: nil, mute: nil)
        call.resolve()
    }

    /// Flatter incremental-clip add — caller hands a few primitives,
    /// we open the AVAudioFile to compute duration, build a default
    /// Studio.AudioClip, and delegate to engine.addClipToTrack.
    /// Useful for callers that don't already have a full clip record
    /// (e.g. quick previews, scratch playback).
    @objc func injectNewClip(_ call: CAPPluginCall) {
        guard let trackId = call.getString("trackId") else { call.reject("trackId required"); return }
        guard let clipId = call.getString("clipId") else { call.reject("clipId required"); return }
        guard let rawPath = call.getString("localPath") else { call.reject("localPath required"); return }
        guard let startSec = call.getDouble("startSeconds") else { call.reject("startSeconds required"); return }
        let offsetSec = call.getDouble("offsetSeconds") ?? 0.0

        // Normalize capacitor:// → /path/ (same logic as addClipToTrack).
        let localPath: String
        if let url = URL(string: rawPath), url.isFileURL {
            localPath = url.path
        } else if rawPath.hasPrefix("/") {
            localPath = rawPath
        } else {
            localPath = rawPath
                .replacingOccurrences(of: "capacitor://localhost/_capacitor_file_", with: "")
                .replacingOccurrences(of: "capacitor://localhost", with: "")
        }

        // Read the file length so duration_seconds is derivable. We need
        // it for transport-aware splicing in TrackBinding.addClip.
        let fileURL = URL(fileURLWithPath: localPath)
        let audioFile: AVAudioFile
        do {
            audioFile = try AVAudioFile(forReading: fileURL)
        } catch {
            call.reject("Could not open audio file: \(error.localizedDescription)")
            return
        }
        let sampleRate = audioFile.processingFormat.sampleRate
        let durationSec = Double(audioFile.length) / sampleRate - offsetSec
        guard durationSec > 0 else {
            call.reject("offsetSeconds exceeds file length")
            return
        }

        let clip = Studio.AudioClip(
            id: clipId,
            kind: .audio,
            asset_id: clipId,
            start_seconds: startSec,
            duration_seconds: durationSec,
            offset_seconds: offsetSec,
            gain_db: 0,
            fade_in_seconds: 0,
            fade_out_seconds: 0,
            reverse: false,
            pitch_semitones: 0,
            time_stretch: 1
        )
        engine.addClipToTrack(trackId: trackId, clip: clip, localFilePath: localPath)
        call.resolve()
    }

    /// Same payload as getHardwareLatencyMs but returns under the
    /// `latencyMs` key (matches the API-shape spec).
    @objc func getHardwareLatency(_ call: CAPPluginCall) {
        call.resolve(["latencyMs": engine.getHardwareLatencyMs()])
    }

    @objc func setPullRendererEnabled(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        engine.setPullRendererEnabled(on)
        call.resolve(["on": on])
    }

    @objc func isPullRendererEnabled(_ call: CAPPluginCall) {
        call.resolve(["on": engine.isPullRendererEnabled()])
    }

    /// JS passes `[{ assetId, localPath }]` — the engine decodes each
    /// one in parallel and seeds the LRU cache. Resolves immediately
    /// (decodes complete in background); progress isn't reported back.
    /// First Play after load now has zero disk I/O.
    @objc func prewarmAssets(_ call: CAPPluginCall) {
        let raw = call.getArray("assets") ?? []
        var entries: [(assetId: String, localFilePath: String)] = []
        for item in raw {
            guard let dict = item as? [String: Any] else { continue }
            guard let aid = dict["assetId"] as? String else { continue }
            guard let path = dict["localPath"] as? String else { continue }
            // Normalize capacitor:// → /path/ same as addClipToTrack.
            let resolved: String
            if let url = URL(string: path), url.isFileURL {
                resolved = url.path
            } else if path.hasPrefix("/") {
                resolved = path
            } else {
                resolved = path
                    .replacingOccurrences(of: "capacitor://localhost/_capacitor_file_", with: "")
                    .replacingOccurrences(of: "capacitor://localhost", with: "")
            }
            entries.append((aid, resolved))
        }
        engine.prewarmAssets(entries)
        call.resolve(["queued": entries.count])
    }

    // MARK: - External-record self-test

    /// Drive prepareExternalRecordSession(mixWithOthers) → externalRecordStart
    /// (2-beat count-in) → ~1s capture → externalRecordStop, then run
    /// Studio's own prepareRecordSession session flip to prove the two paths
    /// don't corrupt each other. Logs file size + latency. Completes on the
    /// main thread with a summary dictionary (also returned to JS callers).
    ///
    /// This requires a real mic + a live audio session, so it produces
    /// meaningful output only on a device — in the simulator the input node
    /// may be silent/absent and the error paths log accordingly.
    #if DEBUG
    private func runExternalRecordSelfTest(_ done: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { done(["ok": false, "error": "plugin gone"]); return }
            NSLog("[ExternalRecorder][selftest] begin")

            // Step 1: prepare (own the session, mixWithOthers).
            self.externalRecorder?.teardown()
            let rec = ExternalRecorder()
            rec.onPeak = { [weak self] db in
                self?.notifyListeners("externalRecordPeak", data: ["db": Double(db)])
            }
            self.externalRecorder = rec

            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(.playAndRecord, mode: .videoRecording,
                                        options: [.mixWithOthers, .defaultToSpeaker, .allowBluetoothA2DP])
                try session.setActive(true)
            } catch {
                NSLog("[ExternalRecorder][selftest] session config failed: \(error.localizedDescription)")
            }
            let latencyMs = (session.inputLatency + session.outputLatency + session.ioBufferDuration) * 1000.0

            let finish: (Bool, String) -> Void = { ok, note in
                // Step 3 (always): flip to Studio's prepareRecordSession
                // recipe (same widened category-OR-mode guard as the real
                // method) and then ASSERT the resulting category + mode —
                // the external cycle leaves .videoRecording behind, so the
                // meaningful check is that Studio's flip lands the session
                // back on .playAndRecord/.default, not merely that
                // setActive didn't throw.
                let s = AVAudioSession.sharedInstance()
                do {
                    if s.category != .playAndRecord || s.mode != .default {
                        try s.setCategory(.playAndRecord, mode: .default,
                                          options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
                    }
                    try s.setActive(true)
                } catch {
                    NSLog("[ExternalRecorder][selftest] Studio prepareRecordSession flip failed: \(error.localizedDescription)")
                }
                let studioOk = (s.category == .playAndRecord && s.mode == .default)
                let summary: [String: Any] = [
                    "ok": ok,
                    "note": note,
                    "hardwareLatencyMs": latencyMs,
                    "studioPrepareRecordSessionOk": studioOk,
                    "studioCategoryAfterFlip": s.category.rawValue,
                    "studioModeAfterFlip": s.mode.rawValue,
                ]
                NSLog("[ExternalRecorder][selftest] summary=\(summary)")
                done(summary)
            }

            // Step 2: start with a 2-beat count-in (0.3s/beat), capture ~1s.
            rec.start(
                countInBeats: 2,
                secondsPerBeat: 0.3,
                clickVolume: 0.7,
                onStarted: { epochMs in
                    NSLog("[ExternalRecorder][selftest] capture started epochMs=\(epochMs)")
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        guard let result = rec.stop() else {
                            finish(false, "stop produced no file")
                            return
                        }
                        let size = (try? FileManager.default.attributesOfItem(atPath: result.url.path)[.size] as? Int) ?? nil
                        NSLog("[ExternalRecorder][selftest] file=\(result.url.lastPathComponent) bytes=\(size ?? -1) durationSec=\(result.durationSec)")
                        finish(true, "captured \(result.durationSec)s, \(size ?? -1) bytes")
                    }
                },
                onError: { message in
                    NSLog("[ExternalRecorder][selftest] start failed: \(message)")
                    finish(false, "start failed: \(message)")
                }
            )
        }
    }
    #endif
}
