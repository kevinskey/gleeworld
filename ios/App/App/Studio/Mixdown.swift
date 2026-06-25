// Render the currently-loaded session to a WAV file using AVAudioEngine
// manual rendering mode. Returns a local file URL; the JS layer uploads
// it as a normal asset or downloads it for the user.
//
// Manual rendering disconnects the engine from real-time IO and lets us
// pull frames at any rate. We schedule every clip / MIDI note up front,
// then render `length + tail` seconds in one pass.

import Foundation
import AVFoundation

public enum StudioMixdown {
    /// Renders `session` to a WAV file. The caller is expected to pass
    /// an engine where the session has just been loaded — we don't
    /// rebuild the graph, we just switch the engine into manual mode.
    public static func render(engine: AVAudioEngine, session: Studio.Session) throws -> URL {
        // Engine must be stopped before switching modes.
        if engine.isRunning { engine.stop() }

        // We render in stereo at 44.1kHz — common, broadly compatible.
        let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
        let maxFrames: AVAudioFrameCount = 4096

        try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: maxFrames)
        try engine.start()

        // Output file at tmp/mixdown-<ts>.wav.
        let outUrl = FileManager.default.temporaryDirectory
            .appendingPathComponent("mixdown-\(Int(Date().timeIntervalSince1970)).wav")
        let outFile = try AVAudioFile(forWriting: outUrl, settings: format.settings,
                                      commonFormat: format.commonFormat, interleaved: format.isInterleaved)

        let totalSeconds = max(1.0, session.length_seconds + 1.5)
        let totalFrames = AVAudioFramePosition(totalSeconds * format.sampleRate)
        let buffer = AVAudioPCMBuffer(pcmFormat: engine.manualRenderingFormat, frameCapacity: maxFrames)!

        while engine.manualRenderingSampleTime < totalFrames {
            let remaining = totalFrames - engine.manualRenderingSampleTime
            let framesThisPass = AVAudioFrameCount(min(Int64(maxFrames), remaining))
            let status = try engine.renderOffline(framesThisPass, to: buffer)
            switch status {
            case .success:
                try outFile.write(from: buffer)
            case .insufficientDataFromInputNode:
                // No more input — write what we have and continue (tail).
                try outFile.write(from: buffer)
            case .cannotDoInCurrentContext:
                // Try again next pass.
                continue
            case .error:
                throw NSError(domain: "StudioMixdown", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "manual render error"
                ])
            @unknown default:
                continue
            }
        }

        engine.stop()
        engine.disableManualRenderingMode()
        return outUrl
    }
}
