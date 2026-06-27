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

    public override func load() {
        engine.onState = { [weak self] state in
            self?.notifyListeners("state", data: [
                "isReady": state.isReady,
                "isPlaying": state.isPlaying,
                "positionSeconds": state.positionSeconds,
                "tempoBpm": state.tempoBpm,
            ])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        do {
            try engine.start()
            call.resolve()
        } catch {
            call.reject("Engine start failed: \(error.localizedDescription)")
        }
    }

    @objc func stopEngine(_ call: CAPPluginCall) {
        engine.stopEngine()
        assetLoader.clearCache()
        call.resolve()
    }

    @objc func loadSession(_ call: CAPPluginCall) {
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

    @objc func play(_ call: CAPPluginCall)  { engine.play(); call.resolve() }
    @objc func pause(_ call: CAPPluginCall) { engine.pause(); call.resolve() }
    @objc func stop(_ call: CAPPluginCall)  { engine.stopTransport(); call.resolve() }

    @objc func seek(_ call: CAPPluginCall) {
        let s = call.getDouble("seconds") ?? 0
        engine.seek(toSeconds: s)
        call.resolve()
    }

    @objc func updateStrip(_ call: CAPPluginCall) {
        guard let trackId = call.getString("trackId") else { call.reject("missing trackId"); return }
        engine.updateTrackStrip(
            id: trackId,
            volumeDb: call.getDouble("volumeDb"),
            pan: call.getDouble("pan"),
            mute: call.getBool("mute"))
        call.resolve()
    }

    @objc func updateTempo(_ call: CAPPluginCall) {
        let bpm = call.getDouble("bpm") ?? 120
        engine.updateTempo(bpm: bpm)
        call.resolve()
    }

    @objc func recordStart(_ call: CAPPluginCall) {
        do {
            try recorder.start()
            call.resolve()
        } catch {
            call.reject("record start failed: \(error.localizedDescription)")
        }
    }

    @objc func recordStop(_ call: CAPPluginCall) {
        guard let url = recorder.stop() else { call.reject("not recording"); return }
        // Return the local file path the JS layer reads + uploads.
        call.resolve(["localUrl": url.absoluteString, "filename": url.lastPathComponent])
    }

    @objc func mixdown(_ call: CAPPluginCall) {
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
