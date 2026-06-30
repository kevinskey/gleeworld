// Background-thread LRU cache for pre-decoded, master-format PCM
// buffers. The pull renderer reads from these buffers on the audio
// thread; this layer guarantees they're already in memory + in the
// right format before the render block ever fires.
//
// Why a cache + LRU:
// • A "loop a 1-bar guitar chop 16 times" session reuses the same
//   source file 16 times. Without a cache, addClipToTrack decodes
//   the same WAV 16 times — wasted CPU + 16× memory.
// • At 100 tracks each pre-decoded into the master mixer's format
//   (e.g. 48 kHz stereo float32), memory can balloon fast. A
//   ~200 MB ceiling with LRU eviction keeps the editor responsive on
//   older iPhones without forcing every clip back through disk on
//   every play.
//
// Thread safety: a serial queue gates mutation, so cache reads from
// random callers are consistent. The buffers themselves are read by
// the realtime audio thread — once a buffer is handed out, the cache
// retains it (so eviction won't deallocate something the renderer is
// mid-mixing). Eviction only drops the cache's reference; ARC keeps
// the buffer alive as long as a PullRenderer still holds it.

import Foundation
import AVFoundation

public final class StudioAudioBufferCache {

    public static let shared = StudioAudioBufferCache()

    private struct Key: Hashable {
        let assetId: String
        let sampleRate: Double
        let channelCount: UInt32
        let commonFormat: Int
    }

    private struct Entry {
        let buffer: AVAudioPCMBuffer
        let approxBytes: Int
        var lastAccess: TimeInterval
    }

    private var entries: [Key: Entry] = [:]
    private var order: [Key] = []  // most-recently-used at end
    private let queue = DispatchQueue(label: "studio.bufferCache",
                                      qos: .userInitiated)
    private let maxBytes: Int

    public init(maxMegabytes: Int = 200) {
        self.maxBytes = maxMegabytes * 1024 * 1024
    }

    private func key(assetId: String, format: AVAudioFormat) -> Key {
        Key(assetId: assetId,
            sampleRate: format.sampleRate,
            channelCount: format.channelCount,
            commonFormat: Int(format.commonFormat.rawValue))
    }

    /// Returns the cached buffer if it exists for this asset id +
    /// target format. Bumps LRU order on hit. Called by the engine
    /// before kicking off a real decode.
    public func get(assetId: String, format: AVAudioFormat) -> AVAudioPCMBuffer? {
        var result: AVAudioPCMBuffer?
        queue.sync {
            let k = self.key(assetId: assetId, format: format)
            if var e = self.entries[k] {
                e.lastAccess = Date().timeIntervalSince1970
                self.entries[k] = e
                // Move to MRU tail.
                if let idx = self.order.firstIndex(of: k) {
                    self.order.remove(at: idx)
                }
                self.order.append(k)
                result = e.buffer
            }
        }
        return result
    }

    /// Insert a freshly decoded buffer. If the cache is over budget,
    /// evicts least-recently-used entries until we're back under.
    public func put(assetId: String, format: AVAudioFormat, buffer: AVAudioPCMBuffer) {
        let bytes = approxBytes(of: buffer)
        queue.sync {
            let k = self.key(assetId: assetId, format: format)
            let e = Entry(buffer: buffer,
                          approxBytes: bytes,
                          lastAccess: Date().timeIntervalSince1970)
            self.entries[k] = e
            if let idx = self.order.firstIndex(of: k) {
                self.order.remove(at: idx)
            }
            self.order.append(k)
            self.evictIfNeeded()
        }
    }

    /// Decode + convert via StudioAudioConverter, caching the result.
    /// Single async entrypoint the engine should prefer.
    public func loadOrDecode(assetId: String,
                             file: AVAudioFile,
                             targetFormat: AVAudioFormat) async throws -> AVAudioPCMBuffer {
        if let hit = get(assetId: assetId, format: targetFormat) { return hit }
        let buf = try await StudioAudioConverter.decodeAndConvertAsync(
            file: file, targetFormat: targetFormat)
        put(assetId: assetId, format: targetFormat, buffer: buf)
        return buf
    }

    public func invalidate(assetId: String) {
        queue.sync {
            let drop = self.entries.keys.filter { $0.assetId == assetId }
            for k in drop {
                self.entries.removeValue(forKey: k)
                if let idx = self.order.firstIndex(of: k) {
                    self.order.remove(at: idx)
                }
            }
        }
    }

    public func clear() {
        queue.sync {
            self.entries.removeAll()
            self.order.removeAll()
        }
    }

    public func currentBytes() -> Int {
        var sum = 0
        queue.sync { sum = self.entries.values.reduce(0) { $0 + $1.approxBytes } }
        return sum
    }

    // Must be called from inside `queue.sync` — mutates entries + order.
    // Evicted buffers are handed to StudioBufferPool instead of being
    // dropped. The next decode that needs a matching capacity bucket
    // pulls from the pool — zero malloc during steady-state churn.
    private func evictIfNeeded() {
        var total = self.entries.values.reduce(0) { $0 + $1.approxBytes }
        while total > self.maxBytes, !self.order.isEmpty {
            let oldest = self.order.removeFirst()
            if let e = self.entries.removeValue(forKey: oldest) {
                total -= e.approxBytes
                // Hand the evicted buffer to the pool. The decoder
                // path checks the pool first before allocating, so a
                // re-decoded asset of similar size avoids malloc.
                StudioBufferPool.shared.release(e.buffer)
            }
        }
    }

    private func approxBytes(of buf: AVAudioPCMBuffer) -> Int {
        // Float32 PCM: frameLength * channelCount * 4 bytes.
        let frames = Int(buf.frameLength)
        let channels = Int(buf.format.channelCount)
        return frames * channels * 4
    }
}
