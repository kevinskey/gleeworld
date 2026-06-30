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

    /// Fires ~30Hz during recording with the latest peak power (dBFS,
    /// negative). The plugin forwards each value to JS via
    /// notifyListeners so the editor's live waveform can draw the
    /// envelope without waiting for the take to finish.
    public var onPeak: ((Float) -> Void)?
    private var peakTimer: Timer?

    public init(engine: AVAudioEngine) {
        self.engine = engine
    }

    public func start() throws {
        // Defensive cleanup: tear down any prior recorder instance even
        // if the isRecording flag says we're idle. A failed previous
        // take (mid-flight crash, force-quit, abandoned watchdog) can
        // leave avRecorder retained but not actively writing — then a
        // second AVAudioRecorder allocation against the same audio
        // session category transition triggers an iOS-internal abort
        // signal that bypasses our try/throw chain. Was the crash
        // reproed on "record second track".
        if let stale = avRecorder {
            stale.stop()
            avRecorder = nil
        }
        peakTimer?.invalidate()
        peakTimer = nil
        isRecording = false

        // CALLER is responsible for ensuring mic permission has already
        // been granted BEFORE this is called. Don't block here — that
        // deadlocked the watchdog when the permission alert had to run
        // on the main thread.

        // Switch the session into a mic-capable category just-in-time.
        // Skip the transition if we're already in playAndRecord —
        // redundant setCategory while a take just finalized can
        // collide with the underlying CoreAudio session state machine.
        let session = AVAudioSession.sharedInstance()
        if session.category != .playAndRecord {
            try session.setCategory(.playAndRecord, mode: .default,
                                    options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
        }
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
        recorder.isMeteringEnabled = true
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

        // Drive the peak callback at ~30 Hz. Capacitor plugin code runs
        // on a background queue with no run loop, so we MUST attach the
        // timer to RunLoop.main explicitly — otherwise it never fires
        // and the JS waveform never gets a sample.
        peakTimer?.invalidate()
        let timer = Timer(timeInterval: 0.033, repeats: true) { [weak self] _ in
            guard let self, let rec = self.avRecorder, self.isRecording else { return }
            rec.updateMeters()
            let db = rec.peakPower(forChannel: 0)
            self.onPeak?(db)
        }
        RunLoop.main.add(timer, forMode: .common)
        peakTimer = timer
    }

    public func stop() -> URL? {
        peakTimer?.invalidate()
        peakTimer = nil
        guard isRecording else { return outputUrl }
        avRecorder?.stop()
        avRecorder = nil
        isRecording = false
        NSLog("[Studio] recorder.stop: file=\(outputUrl?.lastPathComponent ?? "nil")")
        return outputUrl
    }

}
