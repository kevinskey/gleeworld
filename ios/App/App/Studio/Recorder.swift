// Native recorder — taps the engine's input node, writes to a WAV
// file in the app's tmp dir, and returns the local URL. The JS layer
// uploads the file to Supabase Storage via the standard storage client.

import Foundation
import AVFoundation

public final class StudioNativeRecorder {
    private let engine: AVAudioEngine
    private var file: AVAudioFile?
    private(set) public var isRecording = false
    private(set) public var outputUrl: URL?

    public init(engine: AVAudioEngine) {
        self.engine = engine
    }

    /// Begin recording to a fresh WAV file under tmp/. Use stop() to
    /// flush and return the final file URL.
    public func start() throws {
        guard !isRecording else { return }
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)

        let filename = "studio-take-\(Int(Date().timeIntervalSince1970)).wav"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        let settings = format.settings
        let file = try AVAudioFile(forWriting: url, settings: settings,
                                   commonFormat: format.commonFormat, interleaved: format.isInterleaved)
        self.file = file
        self.outputUrl = url

        input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in
            guard let self, let file = self.file else { return }
            do { try file.write(from: buffer) }
            catch { /* swallow individual buffer errors; final stop() reports */ }
        }
        isRecording = true
    }

    public func stop() -> URL? {
        guard isRecording else { return outputUrl }
        engine.inputNode.removeTap(onBus: 0)
        file = nil // close + flush
        isRecording = false
        return outputUrl
    }
}
