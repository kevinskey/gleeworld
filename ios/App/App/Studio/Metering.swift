// Metering — per-node stereo peak tracker fed by AVAudioNode taps.
//
// PeakMeter accumulates the maximum absolute sample per channel
// since the last read. UI polls at ~30 Hz via
// engine.getTrackPeakDbStereo / getBusPeakDbStereo, which reads the
// current peaks and resets them (consume-on-read) so the tap block
// only ever holds a single frame's worth of state between reads.
//
// The tap block runs on AVAudioEngine's realtime audio queue. All
// its updates go through os_unfair_lock — trylock only, so a
// contended write is a dropped frame (peak stays at whatever the
// last write left it) rather than a priority-inversion stall. On
// reader-side we take a full lock (the reader is on the main
// thread; blocking briefly is fine).
//
// This module is standalone-verifiable with swiftc + iOS SDK.

import AVFoundation
import os.lock

public final class PeakMeter {
    /// Max absolute sample per channel since the last read, in dBFS.
    /// -Infinity when no signal has crossed the tap since the last read.
    private var _peakL: Float = -.infinity
    private var _peakR: Float = -.infinity
    private var lock = os_unfair_lock()

    public init() {}

    /// Called from the tap block. `channels[c].pointee` is a UnsafeBufferPointer<Float>
    /// per channel; we walk it once to find the max abs value.
    /// os_unfair_lock_trylock keeps the audio thread from ever
    /// blocking on a contended reader.
    public func write(fromBuffer buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }
        let frameCount = Int(buffer.frameLength)
        if frameCount == 0 { return }
        let channelCount = Int(buffer.format.channelCount)
        var maxL: Float = 0
        var maxR: Float = 0
        for f in 0..<frameCount {
            let l = abs(channelData[0][f])
            if l > maxL { maxL = l }
        }
        if channelCount > 1 {
            for f in 0..<frameCount {
                let r = abs(channelData[1][f])
                if r > maxR { maxR = r }
            }
        } else {
            maxR = maxL
        }
        let dbL = maxL > 0 ? 20 * log10(maxL) : -Float.infinity
        let dbR = maxR > 0 ? 20 * log10(maxR) : -Float.infinity
        if os_unfair_lock_trylock(&lock) {
            if dbL > _peakL { _peakL = dbL }
            if dbR > _peakR { _peakR = dbR }
            os_unfair_lock_unlock(&lock)
        }
        // trylock miss = dropped update (rare, and the next tap
        // frame carries the same signal peak with high probability).
    }

    /// Read the current peak and reset. Returns { L, R } in dBFS.
    /// Blocking lock (reader is main-thread; audio thread only ever
    /// trylocks so this is bounded).
    public func readAndReset() -> (L: Double, R: Double) {
        os_unfair_lock_lock(&lock)
        let l = _peakL
        let r = _peakR
        _peakL = -.infinity
        _peakR = -.infinity
        os_unfair_lock_unlock(&lock)
        return (
            L: l.isFinite ? Double(l) : -Double.infinity,
            R: r.isFinite ? Double(r) : -Double.infinity,
        )
    }
}
