// Automation — Swift mirror of src/lib/studio/automation.ts.
//
// Pure closed-form interpolation over a breakpoint envelope: no Tone,
// no engine, no AVAudioEngine dependency. Same math the web engine
// uses, ported verbatim so a session opened in the iOS app renders
// the same automation values as the web at every transport time.
//
// Types (AutomationPoint, AutomationCurve, etc.) live in
// StudioModel.swift already — this file adds only the algorithm.
// The engine-side scheduler (Automation ramps against the transport
// clock) lands in a follow-up.

import Foundation

extension Studio {

    /// Return the points sorted by time. Storage doesn't enforce
    /// order and unordered points would produce garbage interpolation.
    public static func sortAutomationPoints(_ points: [AutomationPoint]) -> [AutomationPoint] {
        return points.sorted { $0.time_seconds < $1.time_seconds }
    }

    /// Evaluate the automation curve at a given transport time.
    ///
    /// - Returns: `nil` when the points array is empty (caller uses
    ///   the stored session value in that case). Times before the
    ///   first point clamp to the first point's value; times after
    ///   the last point clamp to the last point's value.
    public static func automationValueAt(
        points: [AutomationPoint],
        atSeconds: Double,
    ) -> Double? {
        if points.isEmpty { return nil }
        let sorted = sortAutomationPoints(points)
        if atSeconds <= sorted[0].time_seconds { return sorted[0].value }
        let last = sorted[sorted.count - 1]
        if atSeconds >= last.time_seconds { return last.value }
        // Linear scan for the bracketing pair — automation lists are
        // short in practice (< a hundred points per param); a binary
        // search would be premature optimization.
        for i in 1..<sorted.count {
            let next = sorted[i]
            if atSeconds > next.time_seconds { continue }
            let prev = sorted[i - 1]
            return interpolate(prev: prev, next: next, at: atSeconds)
        }
        return last.value // unreachable in practice
    }

    private static func interpolate(
        prev: AutomationPoint,
        next: AutomationPoint,
        at: Double,
    ) -> Double {
        let span = next.time_seconds - prev.time_seconds
        if span <= 0 { return next.value }
        let t = (at - prev.time_seconds) / span // 0..1
        switch next.curve {
        case .hold:
            // Step at the target time: everything before the point
            // holds the previous value.
            return prev.value
        case .linear:
            return prev.value + (next.value - prev.value) * t
        case .exponential:
            // AVAudioParam-style exponential ramps reject endpoints
            // at or below 0. Fall back to linear when the pair crosses
            // zero — matches the fallback we apply when scheduling
            // on the AudioParam.
            if prev.value <= 0 || next.value <= 0 {
                return prev.value + (next.value - prev.value) * t
            }
            return prev.value * pow(next.value / prev.value, t)
        }
    }
}
