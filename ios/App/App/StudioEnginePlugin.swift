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
        CAPPluginMethod(name: "updateTempo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMetronome", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clickOnce", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveFinalizedTake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareRecordSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mixdown", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addClipToTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeClipFromTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHardwareLatencyMs", returnType: CAPPluginReturnPromise),
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
    }

    public override func load() {
        wireEngineEvents()
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

    @objc func updateTempo(_ call: CAPPluginCall) {
        wireEngineEvents()
        let bpm = call.getDouble("bpm") ?? 120
        engine.updateTempo(bpm: bpm)
        call.resolve()
    }

    @objc func setMetronome(_ call: CAPPluginCall) {
        wireEngineEvents()
        let on = call.getBool("on") ?? false
        let db = call.getDouble("volumeDb")
        DispatchQueue.main.async { [weak self] in
            if let db = db { self?.engine.setMetronomeVolume(db: db) }
            self?.engine.setMetronome(on: on)
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
                if session.category != .playAndRecord {
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
        guard let url = recorder.stop() else { call.reject("not recording"); return }
        // Return the local file path the JS layer reads + uploads.
        call.resolve(["localUrl": url.absoluteString, "filename": url.lastPathComponent])
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
}
