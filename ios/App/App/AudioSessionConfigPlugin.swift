// AudioSessionConfigPlugin
//
// Bridges AVAudioSession into the Capacitor JS layer so the Part Tracks
// studio can opt into iOS measurement mode for vocal recording. This
// bypasses every speech DSP the system normally applies to mic input
// (voice-call echo cancellation, noise suppression, AGC, ducking),
// which is what was muddying the recorded vocals.
//
// Two entry points:
//   - configureForMusicRecording()  – set category .playAndRecord with
//                                     .measurement mode, 48kHz, allow
//                                     bluetooth + mix-with-others so
//                                     Apple Music can still play.
//   - restoreDefault()              – back to .ambient + .default for
//                                     normal app browsing.

import Foundation
import Capacitor
import AVFoundation

@objc(AudioSessionConfigPlugin)
public class AudioSessionConfigPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionConfigPlugin"
    public let jsName = "AudioSessionConfig"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configureForMusicRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreDefault", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentRoute", returnType: CAPPluginReturnPromise),
    ]

    @objc func configureForMusicRecording(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            // .playAndRecord lets us capture mic + play backing.
            // .mixWithOthers keeps Apple Music / YouTube audible.
            // .allowBluetoothA2DP routes playback through AirPods/etc.
            // .defaultToSpeaker keeps the loudspeaker active when there
            // are no headphones — without this iOS routes to the tiny
            // earpiece because we asked for record permission.
            //
            // mode = .videoRecording: designed for apps that capture
            // mic AND play media simultaneously. Disables the speech
            // DSP (echo cancel / noise suppression / AGC) so vocals
            // stay clean, while still permitting Apple Music to play
            // through the audio session. `.measurement` mode would
            // bypass even more processing but the system pauses
            // background media when it's active — singers were
            // recording over silence.
            try session.setCategory(
                .playAndRecord,
                mode: .videoRecording,
                options: [.mixWithOthers, .allowBluetoothA2DP, .defaultToSpeaker]
            )

            // 48kHz, 16-bit, mono. iOS will best-effort honor these.
            try session.setPreferredSampleRate(48_000.0)
            try session.setPreferredInputNumberOfChannels(1)

            // Short I/O buffer so the live-level tap stays responsive.
            // 256 frames @ 48kHz ≈ 5.3ms — well below human perception.
            try session.setPreferredIOBufferDuration(0.005)

            try session.setActive(true, options: [.notifyOthersOnDeactivation])

            let result: [String: Any] = [
                "sampleRate": session.sampleRate,
                "inputNumberOfChannels": session.inputNumberOfChannels,
                "ioBufferDuration": session.ioBufferDuration,
                "category": "playAndRecord",
                "mode": "measurement",
                "route": describeRoute(session.currentRoute),
            ]
            call.resolve(result)
        } catch {
            call.reject("AVAudioSession configure failed: \(error.localizedDescription)")
        }
    }

    @objc func restoreDefault(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            // Restore the same .playback + .mixWithOthers config the
            // AppDelegate installs at launch. Earlier we were setting
            // to .ambient and DEACTIVATING the session, which left
            // MPMusicPlayer (Apple Music backing) silent for every
            // subsequent Play / Record until app restart — it needs
            // an active session to produce audio.
            try session.setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try session.setActive(true)
            call.resolve()
        } catch {
            call.reject("AVAudioSession restore failed: \(error.localizedDescription)")
        }
    }

    @objc func getCurrentRoute(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        call.resolve([
            "route": describeRoute(session.currentRoute),
            "sampleRate": session.sampleRate,
        ])
    }

    private func describeRoute(_ route: AVAudioSessionRouteDescription) -> [String: Any] {
        let inputs = route.inputs.map { port -> [String: Any] in
            [ "portName": port.portName, "portType": port.portType.rawValue ]
        }
        let outputs = route.outputs.map { port -> [String: Any] in
            [ "portName": port.portName, "portType": port.portType.rawValue ]
        }
        // Detect AirPods / headphones so the JS layer can auto-enable
        // music mode (no echo cancellation needed with headphones on).
        let hasHeadphones = route.outputs.contains { port in
            switch port.portType {
            case .headphones, .bluetoothA2DP, .bluetoothHFP, .bluetoothLE, .airPlay:
                return true
            default:
                return false
            }
        }
        return [
            "inputs": inputs,
            "outputs": outputs,
            "hasHeadphones": hasHeadphones,
        ]
    }
}
