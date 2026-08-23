// GWAudioPlayPlugin
//
// Native MP3 playback for the Assistant's spoken replies. WebKit renders
// Web Audio under an ambient-style session that obeys the ring/silent
// switch and inherits whatever route the webview last had, which left the
// assistant "playing" replies into a silenced output (breadcrumbs showed
// decode + start + ended all firing while the device stayed mute).
// AVAudioPlayer under our own .playback session behaves like a media app:
// speaker route, silent switch ignored.
//
// Contract: play{ b64 } resolves immediately after playback starts and
// emits exactly one "playEnded" when the clip finishes or is stopped.
// A second play() while one is active stops the first (barge-in) — the
// interrupted clip does NOT emit playEnded (its delegate is detached), so
// listeners only ever hear about the clip that owns the session.

import Foundation
import Capacitor
import AVFoundation

@objc(GWAudioPlayPlugin)
public class GWAudioPlayPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    public let identifier = "GWAudioPlayPlugin"
    public let jsName = "GWAudioPlay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private var player: AVAudioPlayer?

    @objc func play(_ call: CAPPluginCall) {
        guard let b64 = call.getString("b64"), let data = Data(base64Encoded: b64) else {
            call.reject("missing or invalid b64 audio data")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.player?.delegate = nil
            self.player?.stop()
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try? session.setActive(true)
            do {
                let p = try AVAudioPlayer(data: data)
                p.delegate = self
                let volume = call.getFloat("volume") ?? 1.0
                p.volume = max(0, min(1, volume))
                self.player = p
                p.play()
                call.resolve()
            } catch {
                call.reject("audio init failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { call.resolve(); return }
            if let p = self.player {
                p.delegate = nil
                p.stop()
                self.player = nil
                self.notifyListeners("playEnded", data: [:])
            }
            call.resolve()
        }
    }

    public func audioPlayerDidFinishPlaying(_ p: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if self.player === p { self.player = nil }
            self.notifyListeners("playEnded", data: [:])
        }
    }
}
