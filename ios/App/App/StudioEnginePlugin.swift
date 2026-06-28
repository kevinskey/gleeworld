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
        CAPPluginMethod(name: "recordStart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recordStop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mixdown", returnType: CAPPluginReturnPromise),
    ]

    // Every heavy-init thing is lazy. The plugin instance is created at
    // app launch via MainViewController.capacitorDidLoad — anything
    // touched here runs before any JS or audio session exists.
    private lazy var engine = StudioNativeEngine()
    private lazy var assetLoader = AssetLoader()
    private lazy var recorder = StudioNativeRecorder(engine: engine.avEngine)

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
            let payload: [String: Any] = [
                "isReady": state.isReady,
                "isPlaying": state.isPlaying,
                "positionSeconds": state.positionSeconds,
                "tempoBpm": state.tempoBpm,
                "metronomeOn": state.metronomeOn,
            ]
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
            mute: call.getBool("mute"))
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
}
