// Off-thread asset → master-format conversion.
//
// AVAudioEngine will silently insert format converters between nodes
// when sample rate or channel count don't line up — but that
// conversion happens ON the real-time audio thread, which causes UI
// hang and occasional dropouts when a tenant uploads a 22 kHz mono
// recording into a 48 kHz stereo session.
//
// We pre-convert every clip's source AVAudioFile into one PCM buffer
// already shaped to the master mixer's format, on a background queue,
// before the render path ever sees it. The render thread then just
// reads from contiguous memory — no resampling, no allocation, no
// surprises.

import Foundation
import AVFoundation

public enum StudioAudioConverter {

    /// Returns a fully-decoded PCM buffer in `targetFormat`. Performs
    /// sample-rate + channel-count conversion via AVAudioConverter so
    /// the caller doesn't need to worry about whether the source file
    /// matches the engine's output format.
    ///
    /// Pass a buffer back to the audio thread; never call this from
    /// inside a render block.
    public static func decodeAndConvert(
        file: AVAudioFile,
        targetFormat: AVAudioFormat
    ) throws -> AVAudioPCMBuffer {
        let sourceFormat = file.processingFormat
        let sourceFrameCount = AVAudioFrameCount(file.length)

        // Fast path: source already matches target. Just decode once.
        if formatsCompatible(sourceFormat, targetFormat) {
            guard let buf = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: sourceFrameCount) else {
                throw NSError(domain: "StudioAudioConverter", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Could not allocate source-format buffer"])
            }
            file.framePosition = 0
            try file.read(into: buf)
            return buf
        }

        // Decode the source first into a buffer matching the file's
        // own format. AVAudioFile.read can't directly write into a
        // foreign format buffer.
        guard let sourceBuffer = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: sourceFrameCount) else {
            throw NSError(domain: "StudioAudioConverter", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "Could not allocate source PCM buffer"])
        }
        file.framePosition = 0
        try file.read(into: sourceBuffer)

        // Compute target frame capacity accounting for sample-rate ratio.
        let ratio = targetFormat.sampleRate / sourceFormat.sampleRate
        let targetFrameCapacity = AVAudioFrameCount(Double(sourceBuffer.frameLength) * ratio + 1024)
        guard let targetBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: targetFrameCapacity) else {
            throw NSError(domain: "StudioAudioConverter", code: 3,
                          userInfo: [NSLocalizedDescriptionKey: "Could not allocate target PCM buffer"])
        }

        guard let converter = AVAudioConverter(from: sourceFormat, to: targetFormat) else {
            throw NSError(domain: "StudioAudioConverter", code: 4,
                          userInfo: [NSLocalizedDescriptionKey: "AVAudioConverter init failed (incompatible formats)"])
        }

        var supplied = false
        var convError: NSError?
        let status = converter.convert(to: targetBuffer, error: &convError) { _, outStatus in
            if supplied {
                outStatus.pointee = .noDataNow
                return nil
            }
            supplied = true
            outStatus.pointee = .haveData
            return sourceBuffer
        }

        if status == .error {
            throw convError ?? NSError(domain: "StudioAudioConverter", code: 5,
                                       userInfo: [NSLocalizedDescriptionKey: "AVAudioConverter.convert returned .error"])
        }
        return targetBuffer
    }

    /// Async wrapper — dispatches the decode + convert onto a global
    /// background queue. Use this when wiring from a Capacitor plugin
    /// handler that's already inside an async hop.
    public static func decodeAndConvertAsync(
        file: AVAudioFile,
        targetFormat: AVAudioFormat
    ) async throws -> AVAudioPCMBuffer {
        try await withCheckedThrowingContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let buf = try decodeAndConvert(file: file, targetFormat: targetFormat)
                    cont.resume(returning: buf)
                } catch {
                    cont.resume(throwing: error)
                }
            }
        }
    }

    private static func formatsCompatible(_ a: AVAudioFormat, _ b: AVAudioFormat) -> Bool {
        return a.sampleRate == b.sampleRate
            && a.channelCount == b.channelCount
            && a.commonFormat == b.commonFormat
            && a.isInterleaved == b.isInterleaved
    }
}
