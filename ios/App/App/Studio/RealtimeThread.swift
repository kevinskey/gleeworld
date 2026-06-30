// Real-time thread priority fencing for audio worker tasks.
//
// AVAudioEngine's render thread already runs under
// THREAD_TIME_CONSTRAINT_POLICY automatically — Apple handles that.
// But our own background workers (ClipStreamer's refill task,
// StudioAudioBufferCache eviction) run on .userInitiated dispatch
// queues whose threads can be preempted by:
//   • Heavy React UI animations (CADisplayLink frames)
//   • Incoming SMS / push notification handlers
//   • Other apps' background tasks under iOS Focus filters
//
// We register a time-constraint policy on the calling thread so the
// kernel treats this worker as a soft-realtime task that must
// complete `computation` mach ticks of work within every `period`,
// and may not be preempted (preemptible = 0).
//
// Apply at the start of each worker task. The policy applies to the
// CURRENT thread; if the queue migrates the work to a different
// thread on a later call, we re-pin. For one-shot tasks this is
// cheap (~µs to set + ~µs to release mach port).
//
// Sample apple reference:
//   https://developer.apple.com/library/archive/technotes/tn2169/_index.html

import Foundation
import Darwin

public enum RealtimeThread {

    /// Promote the current thread to real-time audio priority.
    ///
    /// Defaults assume the typical audio driver buffer quantum on
    /// modern iPhones (256 frames @ 44.1 kHz ≈ 5.8 ms period). The
    /// computation budget (≈ 25% of the period) and constraint
    /// (≈ 50% of the period) give the kernel enough scheduling slack
    /// to avoid starving foreground UI rendering on a 60 fps display,
    /// while still guaranteeing the audio worker fires on time.
    ///
    /// Returns true on success. False means the kernel rejected the
    /// promotion (rare — usually only happens if the thread is
    /// already in a contradictory policy state).
    @discardableResult
    public static func promoteCurrentThread(
        bufferFrames: UInt32 = 256,
        sampleRate: Double = 44100,
        computationFraction: Double = 0.25,
        constraintFraction: Double = 0.50
    ) -> Bool {
        // Convert audio-clock budget to nanoseconds, then to mach
        // ticks via mach_timebase_info — the policy fields are in
        // mach ticks, not nanoseconds.
        let periodSec = Double(bufferFrames) / sampleRate
        let periodNanos = periodSec * 1_000_000_000.0
        let computationNanos = periodNanos * computationFraction
        let constraintNanos = periodNanos * constraintFraction

        var timebase = mach_timebase_info_data_t()
        mach_timebase_info(&timebase)
        // Nanos × denom / numer = host ticks.
        let nanoToTicks: (Double) -> UInt32 = { nanos in
            let ticks = nanos * Double(timebase.denom) / Double(timebase.numer)
            return UInt32(min(Double(UInt32.max), max(1.0, ticks)))
        }

        var policy = thread_time_constraint_policy_data_t(
            period:       nanoToTicks(periodNanos),
            computation:  nanoToTicks(computationNanos),
            constraint:   nanoToTicks(constraintNanos),
            preemptible:  0
        )

        // mach_thread_self() RETAINS a send right — we must release
        // it via mach_port_deallocate to avoid leaking ports.
        let port = mach_thread_self()
        defer { mach_port_deallocate(mach_task_self_, port) }

        // The policy is a struct of integer_t fields; convert the
        // pointer for the C API by rebinding memory.
        let fieldCount = MemoryLayout<thread_time_constraint_policy_data_t>.size
                       / MemoryLayout<integer_t>.size
        let count = mach_msg_type_number_t(fieldCount)
        let result = withUnsafeMutablePointer(to: &policy) { ptr -> kern_return_t in
            ptr.withMemoryRebound(to: integer_t.self, capacity: fieldCount) { intPtr in
                thread_policy_set(port,
                                  UInt32(THREAD_TIME_CONSTRAINT_POLICY),
                                  intPtr,
                                  count)
            }
        }
        if result != KERN_SUCCESS {
            NSLog("[Studio] RealtimeThread.promote failed: kr=\(result)")
            return false
        }
        return true
    }
}
