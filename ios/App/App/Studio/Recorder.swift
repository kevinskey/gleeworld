// Native recorder — uses AVAudioRecorder (the high-level Apple API)
// instead of AVAudioEngine.installTap. Trade-off: we lose live metering
// for now, but AVAudioRecorder converts every failure mode into a clean
// Swift error, so a missing mic permission or an audio session conflict
// surfaces as a JS toast instead of crashing the whole app.
//
// AVAudioRecorder writes directly to a WAV file we hand it. JS reads
// the bytes back from the local URL and uploads.

import Foundation
import AVFoundation

public final class StudioNativeRecorder {
    /// We keep an `engine` reference for API symmetry with the previous
    /// implementation, but AVAudioRecorder doesn't need it — the
    /// recorder is independent of the playback graph.
    private let engine: AVAudioEngine
    private var avRecorder: AVAudioRecorder?
    private(set) public var isRecording = false
    private(set) public var outputUrl: URL?

    public init(engine: AVAudioEngine) {
        self.engine = engine
    }

    public func start() throws {
        guard !isRecording else { return }

        // CALLER is responsible for ensuring mic permission has already
        // been granted BEFORE this is called. Don't block here — that
        // deadlocked the watchdog when the permission alert had to run
        // on the main thread.

        // Switch the session into a mic-capable category just-in-time.
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default,
                                options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
        try session.setActive(true)

        // Sanity-check — if permission still isn't granted, throw a
        // proper Swift error rather than letting AVAudioRecorder do
        // something undefined.
        if session.recordPermission != .granted {
            throw NSError(domain: "StudioRecorder", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Microphone permission required. Enable it in Settings → GleeWorld.",
            ])
        }

        let filename = "studio-take-\(Int(Date().timeIntervalSince1970)).wav"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        self.outputUrl = url

        // 44.1 kHz, 16-bit, mono PCM — small files, universal compatibility.
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: 44_100.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        let recorder = try AVAudioRecorder(url: url, settings: settings)
        recorder.prepareToRecord()
        let ok = recorder.record()
        if !ok {
            throw NSError(domain: "StudioRecorder", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "AVAudioRecorder refused to start recording"
            ])
        }
        self.avRecorder = recorder
        isRecording = true
        NSLog("[Studio] recorder.start: recording to \(url.lastPathComponent)")
    }

    public func stop() -> URL? {
        guard isRecording else { return outputUrl }
        avRecorder?.stop()
        avRecorder = nil
        isRecording = false
        NSLog("[Studio] recorder.stop: file=\(outputUrl?.lastPathComponent ?? "nil")")
        return outputUrl
    }

}
