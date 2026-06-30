// Pull-based per-track renderer.
//
// AVAudioSourceNode invokes our render block on the realtime audio
// thread. We mix every active clip's pre-decoded buffer into the
// supplied output buffer, then advance the master sample cursor.
//
// Architecture notes:
// • Buffers must already be in the master output format
//   (use StudioAudioConverter.decodeAndConvert to pre-process before
//   handing a clip here). The render block does ZERO conversion,
//   ZERO allocation, ZERO locking — only memcpy + sample-rate-aware
//   summation into the output.
// • Clip metadata is stored in a lock-free atomic snapshot. UI thread
//   builds a new snapshot and atomically swaps the pointer in; the
//   render block reads whichever snapshot is current at the moment it
//   fires. No mid-render mutation is possible.
// • Position cursor is owned by the engine's transport. The renderer
//   asks for "current frame" via a closure each render so we don't
//   have to plumb the host time anchor through every clip.
//
// This sits ALONGSIDE the existing AVAudioPlayerNode path. The track
// chooses one or the other based on TrackBinding.useSourceNode (false
// today; flip on per-tenant when we're ready to validate).

import Foundation
import AVFoundation
import Accelerate  // vDSP_vsma SIMD multiply-accumulate

/// One clip's worth of decoded audio + its placement on the timeline.
public struct PullRendererClip {
    public let id: String
    public let buffer: AVAudioPCMBuffer    // already in target format
    public let startSeconds: Double         // when on the timeline the clip starts
    public let durationSeconds: Double      // how long it plays
    public let offsetSeconds: Double        // skip-in within the buffer
    public let gainLinear: Float            // per-clip gain (multiplier)

    public init(id: String, buffer: AVAudioPCMBuffer,
                startSeconds: Double, durationSeconds: Double,
                offsetSeconds: Double, gainLinear: Float = 1.0) {
        self.id = id
        self.buffer = buffer
        self.startSeconds = startSeconds
        self.durationSeconds = durationSeconds
        self.offsetSeconds = offsetSeconds
        self.gainLinear = gainLinear
    }
}

/// Lock-free snapshot of all clips active on a track. Replaced
/// atomically when the UI thread adds/removes/edits a clip. The
/// audio thread reads `box.snapshot` at the top of each render
/// callback, so we're guaranteed a consistent view for the duration
/// of that callback.
private final class ClipSnapshot {
    let clips: [PullRendererClip]
    init(_ clips: [PullRendererClip]) { self.clips = clips }
}

/// Reference holder so the render closure can read the latest
/// snapshot without capturing `self`. The render closure captures
/// the box; UI thread mutators write `box.snapshot`; the audio
/// thread reads `box.snapshot` — single 8-byte property read.
private final class SnapshotBox {
    var snapshot: ClipSnapshot = ClipSnapshot([])
}

public final class PullRenderer {
    public let sourceNode: AVAudioSourceNode
    private let outputFormat: AVAudioFormat
    private let sampleRate: Double
    private let channelCount: Int

    // Atomic snapshot, held via a class box so the render closure can
    // capture the box (not self) and avoid the partial-init dance when
    // `sourceNode` is being constructed. NSLock could also work, but
    // we deliberately swap the whole reference (an atomic 8-byte
    // store on arm64) and rely on ARC's release semantics so the
    // audio thread never blocks on the UI thread.
    private let snapshotBox = SnapshotBox()
    private let snapshotQueue = DispatchQueue(label: "studio.pullrenderer.snapshot",
                                              qos: .userInitiated)

    /// Closure the renderer calls each render to learn where on the
    /// timeline we currently are. Engine owns the master cursor; we
    /// just read it. Returns the timeline position (seconds) of the
    /// FIRST frame in the current render window.
    private let currentTimelineSeconds: () -> Double

    public init(outputFormat: AVAudioFormat,
                currentTimelineSeconds: @escaping () -> Double) {
        self.outputFormat = outputFormat
        self.sampleRate = outputFormat.sampleRate
        self.channelCount = Int(outputFormat.channelCount)
        self.currentTimelineSeconds = currentTimelineSeconds

        // Capture references before initializing sourceNode so the
        // render block doesn't need `self` (would be partially
        // initialized at this point — `sourceNode` itself is being
        // constructed). The SnapshotBox holds the live clip list
        // independently.
        let captureSampleRate = self.sampleRate
        let captureChannelCount = self.channelCount
        let getPosition = self.currentTimelineSeconds
        let box = self.snapshotBox

        // The render block must be realtime-safe: no allocation, no
        // Swift runtime calls (no print/NSLog/etc), no locks.
        self.sourceNode = AVAudioSourceNode(format: outputFormat) {
            (_, _, frameCount, audioBufferList) -> OSStatus in
            let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
            let frames = Int(frameCount)

            // Zero the output first so silent regions stay silent.
            // vDSP_vclr writes a SIMD-aligned zero stream — same cost
            // as memset in practice but keeps the inner loop entirely
            // inside Accelerate (no libc transitions on the audio
            // thread). Matches the pattern desktop DAWs use to keep
            // the audio-thread call surface tight.
            for ch in 0..<min(captureChannelCount, ablPointer.count) {
                if let data = ablPointer[ch].mData?.assumingMemoryBound(to: Float.self) {
                    vDSP_vclr(data, 1, vDSP_Length(frames))
                }
            }

            let snap = box.snapshot
            if snap.clips.isEmpty { return noErr }

            let renderStartSec = getPosition()
            let renderEndSec = renderStartSec + Double(frames) / captureSampleRate

            for clip in snap.clips {
                let clipStart = clip.startSeconds
                let clipEnd = clip.startSeconds + clip.durationSeconds
                if clipEnd <= renderStartSec || clipStart >= renderEndSec { continue }

                // Where in the output buffer this clip's first audible
                // frame lands (could be negative if the clip started
                // before the render window — we trim).
                let clipFirstOutputFrame = max(0, Int(((clipStart - renderStartSec) * captureSampleRate).rounded()))
                let clipLastOutputFrame = min(frames, Int(((clipEnd - renderStartSec) * captureSampleRate).rounded()))
                if clipLastOutputFrame <= clipFirstOutputFrame { continue }

                // Where to read inside the clip's buffer. offset_seconds
                // is the skip-in; we also advance by however much of the
                // clip already played before this render window.
                let preRollSec = max(0, renderStartSec - clipStart)
                let readStartInBufferSec = clip.offsetSeconds + preRollSec
                let readStartFrame = Int((readStartInBufferSec * captureSampleRate).rounded())
                let framesToMix = clipLastOutputFrame - clipFirstOutputFrame
                let bufferLength = Int(clip.buffer.frameLength)
                if readStartFrame >= bufferLength { continue }
                let actualMixFrames = min(framesToMix, bufferLength - readStartFrame)
                if actualMixFrames <= 0 { continue }

                let gain = clip.gainLinear

                // Mix each output channel from the matching buffer
                // channel (with mono → stereo broadcast if needed).
                // vDSP_vsma is "vector scalar multiply and add" —
                //   write[i] = read[i] * gain + write[i]
                // for i in 0..<actualMixFrames, executed via NEON/SIMD
                // (4–8 floats per cycle on Apple Silicon). One call
                // replaces what was a scalar Swift loop.
                var localGain = gain
                for outCh in 0..<min(captureChannelCount, ablPointer.count) {
                    guard let outPtr = ablPointer[outCh].mData?.assumingMemoryBound(to: Float.self) else { continue }
                    let inCh = min(outCh, Int(clip.buffer.format.channelCount) - 1)
                    guard let inFloatChannels = clip.buffer.floatChannelData else { continue }
                    let inPtr = inFloatChannels[inCh]
                    let writeAt = outPtr.advanced(by: clipFirstOutputFrame)
                    let readAt = inPtr.advanced(by: readStartFrame)
                    vDSP_vsma(readAt, 1,
                              &localGain,
                              writeAt, 1,
                              writeAt, 1,
                              vDSP_Length(actualMixFrames))
                }
            }
            return noErr
        }
    }

    // MARK: - UI-thread mutators (snapshot replace, never in-place mutate)

    public func setClips(_ clips: [PullRendererClip]) {
        let next = ClipSnapshot(clips)
        snapshotQueue.sync { self.snapshotBox.snapshot = next }
    }

    public func addClip(_ clip: PullRendererClip) {
        snapshotQueue.sync {
            var copy = self.snapshotBox.snapshot.clips
            // Replace if same id already present.
            if let idx = copy.firstIndex(where: { $0.id == clip.id }) {
                copy[idx] = clip
            } else {
                copy.append(clip)
            }
            self.snapshotBox.snapshot = ClipSnapshot(copy)
        }
    }

    public func removeClip(id: String) {
        snapshotQueue.sync {
            let next = self.snapshotBox.snapshot.clips.filter { $0.id != id }
            self.snapshotBox.snapshot = ClipSnapshot(next)
        }
    }

    public func clipCount() -> Int {
        var count = 0
        snapshotQueue.sync { count = self.snapshotBox.snapshot.clips.count }
        return count
    }
}
