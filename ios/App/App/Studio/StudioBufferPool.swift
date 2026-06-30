// Pre-allocated AVAudioPCMBuffer pool.
//
// AVAudioPCMBuffer(pcmFormat:frameCapacity:) calls malloc under the
// hood. malloc on the audio thread is a known cause of glitches —
// even on the UI thread it can lock briefly under memory pressure.
//
// Pro DAWs avoid this by pre-allocating their working memory once,
// at session open, and reusing buffers across clip add/remove/slice
// operations. We follow the same pattern:
//
// • On first use the pool is empty. Every decode triggers a normal
//   AVAudioPCMBuffer allocation (the unavoidable cost-of-entry).
// • When a buffer is released (clip removed, cache evicted), the
//   pool keeps it instead of dropping the reference.
// • The next acquire that matches (sampleRate × channelCount × frame
//   capacity ≥ requested) pops the existing buffer + zeros its head,
//   returning it instead of allocating a fresh one.
// • Net effect: after warmup, **zero new malloc** during clip churn.
//
// Buffers are bucketed by frame capacity rounded up to the next
// power of 2 so common sample lengths share buckets. A 44100-sample
// recording and a 65536-sample recording both land in the 65536
// bucket, so a re-record of a similar take never re-allocates.

import Foundation
import AVFoundation

public final class StudioBufferPool {

    public static let shared = StudioBufferPool()

    private struct Key: Hashable {
        let sampleRate: Int        // rounded to Int — float keys are dangerous
        let channelCount: UInt32
        let capacityBucket: Int    // next power of 2 ≥ requested frames
        let commonFormat: Int
    }

    private var freeBuffers: [Key: [AVAudioPCMBuffer]] = [:]
    private let queue = DispatchQueue(label: "studio.bufferPool",
                                      qos: .userInitiated)
    private let maxBuffersPerBucket: Int
    private var totalReused: Int = 0       // diagnostics
    private var totalAllocated: Int = 0    // diagnostics
    private var totalReleased: Int = 0     // diagnostics

    public init(maxBuffersPerBucket: Int = 16) {
        self.maxBuffersPerBucket = maxBuffersPerBucket
    }

    /// Acquire a buffer of at least `frameCapacity` frames in the
    /// supplied format. Returns a pool-recycled buffer when available,
    /// otherwise allocates a fresh one. The returned buffer is zeroed
    /// and frameLength is set to 0; caller is responsible for filling
    /// + setting frameLength before render.
    public func acquire(format: AVAudioFormat,
                        frameCapacity: AVAudioFrameCount) -> AVAudioPCMBuffer? {
        let bucket = capacityBucket(for: frameCapacity)
        let key = Key(sampleRate: Int(format.sampleRate),
                      channelCount: format.channelCount,
                      capacityBucket: bucket,
                      commonFormat: Int(format.commonFormat.rawValue))
        var reused: AVAudioPCMBuffer?
        queue.sync {
            if var list = self.freeBuffers[key], !list.isEmpty {
                reused = list.removeLast()
                self.freeBuffers[key] = list
                self.totalReused += 1
            }
        }
        if let buf = reused {
            // Zero the head so the caller never sees stale samples
            // from a previous clip. Only the requested length window
            // needs zeroing — the rest will be overwritten on fill.
            if let channels = buf.floatChannelData {
                let nChans = Int(buf.format.channelCount)
                let chFrames = Int(bucket)
                for ch in 0..<nChans {
                    memset(channels[ch], 0, chFrames * MemoryLayout<Float>.size)
                }
            }
            buf.frameLength = 0
            return buf
        }
        // Pool miss → allocate fresh. AVAudioPCMBuffer needs the
        // bucket-rounded capacity so the next release can land in the
        // same bucket and be reused.
        guard let fresh = AVAudioPCMBuffer(pcmFormat: format,
                                           frameCapacity: AVAudioFrameCount(bucket)) else {
            return nil
        }
        queue.sync { self.totalAllocated += 1 }
        return fresh
    }

    /// Return a buffer to the pool for future reuse. Pool drops the
    /// reference (lets ARC dealloc) if the bucket is full to bound
    /// total memory.
    public func release(_ buffer: AVAudioPCMBuffer) {
        let bucket = capacityBucket(for: buffer.frameCapacity)
        let key = Key(sampleRate: Int(buffer.format.sampleRate),
                      channelCount: buffer.format.channelCount,
                      capacityBucket: bucket,
                      commonFormat: Int(buffer.format.commonFormat.rawValue))
        queue.sync {
            self.totalReleased += 1
            var list = self.freeBuffers[key] ?? []
            if list.count >= self.maxBuffersPerBucket { return }
            list.append(buffer)
            self.freeBuffers[key] = list
        }
    }

    /// Diagnostic snapshot. Used by tests + admin UI to see whether
    /// the pool is actually being hit.
    public struct Stats {
        public let reused: Int
        public let allocated: Int
        public let released: Int
        public let bucketCount: Int
        public let resident: Int   // total buffers held in the pool right now
    }

    public func stats() -> Stats {
        var resident = 0
        var s = Stats(reused: 0, allocated: 0, released: 0, bucketCount: 0, resident: 0)
        queue.sync {
            for list in self.freeBuffers.values { resident += list.count }
            s = Stats(reused: self.totalReused,
                      allocated: self.totalAllocated,
                      released: self.totalReleased,
                      bucketCount: self.freeBuffers.count,
                      resident: resident)
        }
        return s
    }

    /// Drop every buffer the pool holds. Use on memory-pressure
    /// notifications.
    public func purge() {
        queue.sync { self.freeBuffers.removeAll() }
    }

    // MARK: - Internals

    /// Round `frames` up to the next power of 2 so similar-sized
    /// requests share buckets. Cap at 16M (≈ 5.5 min @ 48 kHz mono)
    /// — anything larger gets its own oversize bucket which never
    /// pools (one-shot rare giant clips).
    private func capacityBucket(for frames: AVAudioFrameCount) -> Int {
        let n = Int(frames)
        if n <= 0 { return 0 }
        if n >= 16 * 1024 * 1024 { return n }
        var p = 1
        while p < n { p <<= 1 }
        return p
    }
}
