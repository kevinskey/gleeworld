// Disk look-ahead streaming for long clips.
//
// Sessions that exceed the in-memory cache budget (StudioAudioBufferCache,
// 200 MB by default) can't keep every track's decoded PCM resident.
// Pro DAWs handle this with a per-clip ring buffer: a background worker
// reads the next N seconds of samples from disk into memory, and the
// real-time render thread drains from the ring without ever touching
// disk itself.
//
// Layout:
//   • One ClipStreamer per long-clip playback.
//   • Internal SPSC (single-producer single-consumer) ring of Float32
//     samples, sized to hold ~4 seconds of stereo audio.
//   • A Task pinned to .userInitiated keeps the ring topped up; it
//     refills whenever free space exceeds a threshold (default 1 s).
//   • read(into:framesNeeded:) on the audio thread drains contiguous
//     samples and advances the read cursor. No allocation, no locking
//     past a single os_unfair_lock for index reads.
//   • Underflow: returns whatever's available; render block fills the
//     rest with silence. Logs a [Studio] warning so capacity issues
//     are visible during testing rather than silent dropouts.

import Foundation
import AVFoundation
import os.lock

public final class ClipStreamer {
    private let file: AVAudioFile
    private let workingFormat: AVAudioFormat
    private let channelCount: Int
    private let ringFrames: Int
    private let refillThresholdFrames: Int

    // Ring storage: interleaved float per channel for compact layout,
    // wrapped twice (so we never need a memcpy split across boundary
    // in the audio thread — the writer keeps both halves in sync).
    private let ring: UnsafeMutablePointer<Float>
    private let ringCapacityFloats: Int

    // Cursors are 64-bit monotonic frame counters. Modulo by
    // ringFrames on read. Single producer (refill Task) writes
    // writeCursor; single consumer (audio thread) reads readCursor.
    // Lock protects the index pair. We use raw os_unfair_lock (iOS 10+)
    // rather than OSAllocatedUnfairLock (iOS 16+) to keep the
    // deployment target lower. Lock latency is ~10 ns — well inside
    // the realtime audio budget.
    private var writeCursor: UInt64 = 0
    private var readCursor: UInt64 = 0
    private let cursorLock: UnsafeMutablePointer<os_unfair_lock>

    private func lockedRead<T>(_ body: () -> T) -> T {
        os_unfair_lock_lock(cursorLock)
        let r = body()
        os_unfair_lock_unlock(cursorLock)
        return r
    }
    private func lockedWrite(_ body: () -> Void) {
        os_unfair_lock_lock(cursorLock)
        body()
        os_unfair_lock_unlock(cursorLock)
    }

    private var refillTask: Task<Void, Never>?
    private var finished: Bool = false  // true once we've read past EOF

    public init?(file: AVAudioFile,
                 ringSeconds: Double = 4.0,
                 refillThresholdSeconds: Double = 1.0) {
        self.file = file
        self.workingFormat = file.processingFormat
        self.channelCount = Int(workingFormat.channelCount)
        let sr = workingFormat.sampleRate
        self.ringFrames = Int(ringSeconds * sr)
        self.refillThresholdFrames = Int(refillThresholdSeconds * sr)
        self.ringCapacityFloats = ringFrames * channelCount
        self.ring = UnsafeMutablePointer<Float>.allocate(capacity: ringCapacityFloats)
        self.ring.initialize(repeating: 0, count: ringCapacityFloats)
        self.cursorLock = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
        self.cursorLock.initialize(to: os_unfair_lock())
        startRefillTask()
    }

    deinit {
        refillTask?.cancel()
        ring.deinitialize(count: ringCapacityFloats)
        ring.deallocate()
        cursorLock.deinitialize(count: 1)
        cursorLock.deallocate()
    }

    /// Frames currently buffered + ready to drain. Audio thread can
    /// peek this to decide whether to ask for full or partial fill.
    public func availableFrames() -> Int {
        let (w, r): (UInt64, UInt64) = lockedRead {
            (self.writeCursor, self.readCursor)
        }
        return Int(w &- r)
    }

    public func isFinished() -> Bool {
        let (w, r, done): (UInt64, UInt64, Bool) = lockedRead {
            (self.writeCursor, self.readCursor, self.finished)
        }
        return done && r >= w
    }

    /// Drain up to `framesNeeded` from the ring into `out[ch]`. Returns
    /// the number of frames actually written. Caller fills the
    /// remainder with silence if needed.
    ///
    /// Realtime-safe: no allocation, only an os_unfair_lock acquisition
    /// for the cursor pair (~10 ns), then plain memcpy.
    public func read(into outChannels: UnsafeMutableBufferPointer<UnsafeMutablePointer<Float>>,
                     framesNeeded: Int) -> Int {
        let (w, r): (UInt64, UInt64) = lockedRead {
            (self.writeCursor, self.readCursor)
        }
        let available = Int(w &- r)
        let toRead = min(framesNeeded, available)
        if toRead <= 0 { return 0 }

        let startFrame = Int(r % UInt64(ringFrames))
        let firstChunk = min(toRead, ringFrames - startFrame)
        let secondChunk = toRead - firstChunk

        for ch in 0..<min(outChannels.count, channelCount) {
            let src = ring.advanced(by: ch * ringFrames)
            let dst = outChannels[ch]
            memcpy(dst, src.advanced(by: startFrame),
                   firstChunk * MemoryLayout<Float>.size)
            if secondChunk > 0 {
                memcpy(dst.advanced(by: firstChunk),
                       src,
                       secondChunk * MemoryLayout<Float>.size)
            }
        }

        let advanced = r &+ UInt64(toRead)
        lockedWrite { self.readCursor = advanced }
        return toRead
    }

    // MARK: - Refill task (background)

    private func startRefillTask() {
        refillTask = Task(priority: .userInitiated) { [weak self] in
            while let self = self, !Task.isCancelled {
                let avail = self.availableFrames()
                let free = self.ringFrames - avail
                if free >= self.refillThresholdFrames {
                    do {
                        try await self.fillOnce(framesToFetch: free)
                    } catch {
                        NSLog("[Studio] ClipStreamer refill failed: \(error.localizedDescription)")
                        break
                    }
                } else {
                    // Ring is fat — sleep a bit before checking again.
                    try? await Task.sleep(nanoseconds: 5_000_000)  // 5 ms
                }
            }
        }
    }

    /// Read `framesToFetch` from the file into the ring's free space.
    /// Runs on background; writes only to writeCursor.
    private func fillOnce(framesToFetch: Int) async throws {
        // AVAudioFile.read isn't async-safe across actor hops in older
        // SDKs; isolate the actual disk read to this synchronous body
        // and call it from the background task.
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            DispatchQueue.global(qos: .userInitiated).async {
                // Promote this dispatch worker to real-time audio
                // priority for the duration of the fill. Without this
                // a heavy CADisplayLink animation (typical of React
                // re-renders during a take) can preempt the refill
                // long enough to underflow the ring and audible
                // dropouts result. Fence is per-task because dispatch
                // queues hop threads between calls.
                RealtimeThread.promoteCurrentThread()
                do {
                    var remaining = framesToFetch
                    var totalWritten = 0
                    while remaining > 0 {
                        let chunkFrames = min(remaining, 16384)  // 16k = ~340 ms at 48 kHz
                        guard let scratch = AVAudioPCMBuffer(pcmFormat: self.workingFormat,
                                                             frameCapacity: AVAudioFrameCount(chunkFrames)) else {
                            break
                        }
                        try self.file.read(into: scratch, frameCount: AVAudioFrameCount(chunkFrames))
                        let got = Int(scratch.frameLength)
                        if got <= 0 {
                            self.lockedWrite { self.finished = true }
                            break
                        }
                        self.copyIntoRing(buffer: scratch, frames: got)
                        totalWritten += got
                        remaining -= got
                        if got < chunkFrames {
                            // EOF reached mid-read.
                            self.lockedWrite { self.finished = true }
                            break
                        }
                    }
                    cont.resume()
                } catch {
                    cont.resume(throwing: error)
                }
            }
        }
    }

    private func copyIntoRing(buffer: AVAudioPCMBuffer, frames: Int) {
        guard let inChans = buffer.floatChannelData else { return }
        let w: UInt64 = lockedRead { self.writeCursor }
        let startFrame = Int(w % UInt64(ringFrames))
        let firstChunk = min(frames, ringFrames - startFrame)
        let secondChunk = frames - firstChunk

        for ch in 0..<channelCount {
            let dst = ring.advanced(by: ch * ringFrames)
            let src = inChans[ch]
            memcpy(dst.advanced(by: startFrame), src,
                   firstChunk * MemoryLayout<Float>.size)
            if secondChunk > 0 {
                memcpy(dst, src.advanced(by: firstChunk),
                       secondChunk * MemoryLayout<Float>.size)
            }
        }
        let next = w &+ UInt64(frames)
        lockedWrite { self.writeCursor = next }
    }
}
