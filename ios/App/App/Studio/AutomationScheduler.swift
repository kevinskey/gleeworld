// AutomationScheduler — engine-side driver for breakpoint envelopes.
//
// Mirror of src/lib/studio/engine/automation.ts, adapted to the way
// the native iOS engine actually applies mixer state. Where the web
// engine schedules AudioParam ramps against Tone.Transport, iOS
// applies volume/pan writes via AVAudioMixerNode's outputVolume and
// pan properties — there's no first-class ramp API on those. So this
// scheduler runs a single ~60 Hz Timer during playback that:
//
//   1. Reads the current transport position.
//   2. For each active envelope, interpolates the value at that
//      position via Studio.automationValueAt (from Automation.swift).
//   3. Writes the interpolated value to the target strip via the
//      writer closure supplied by the caller.
//
// Timer-based writes are millisecond-precision on the main runloop —
// well below human tolerance for volume/pan changes (~10 ms). Tighter
// sample-accurate ramping can layer on later if needed (block-rate
// scheduling from a render-thread source node).
//
// Cancel semantics match the web engine: the scheduler stops writing
// on pause/stop/seek/dispose, and re-arms on play() with a fresh
// interpolation at the new transport position.

import Foundation

public final class AutomationScheduler {
    /// Envelope + resolved writer closure. One entry per applicable
    /// automation in the session (read / touch / latch).
    private struct Active {
        let entry: Studio.Automation
        let writer: (Double) -> Void
        /// Stable identity key so a mid-play suspend/resume can filter
        /// one envelope in/out without a rescan. Matches the string
        /// the web engine builds in envelopeKey().
        let key: String
    }
    private var active: [Active] = []
    private var timer: Timer?
    private var positionProvider: (() -> Double)?
    /// Envelope keys currently suspended by touch — the tick skips them
    /// so the mixer's live fader writes are uncontested.
    private var suspendedKeys = Set<String>()

    /// Fires 60 times per second during playback — 16.67 ms cadence.
    /// Matches display refresh so a fader driven by automation looks
    /// smooth on the UI if the mixer's state is ever mirrored back to
    /// the web.
    private static let tickInterval: TimeInterval = 1.0 / 60.0

    public init() {}

    /// Stable key for one (kind, id, param) envelope — must match the
    /// string the web engine builds in envelopeKey().
    public static func envelopeKey(
        kind: Studio.AutomationTargetKind,
        id: String,
        param: Studio.AutomationParam,
    ) -> String {
        return "\(kind.rawValue):\(id):\(param.rawValue)"
    }

    /// Arm the scheduler for a fresh play(). Every previously-active
    /// envelope is cancelled first so re-arming from a different
    /// transport position doesn't stack timers.
    ///
    /// - Parameters:
    ///   - automation: session.automation entries. Entries with
    ///     `.mode` in `{read, touch, latch}` are applied; `off` and
    ///     `write` never schedule.
    ///   - positionProvider: closure returning the current transport
    ///     position in seconds. Called every timer tick.
    ///   - targetResolver: closure that maps (target_id, target_kind,
    ///     param) to a writer closure. Returns nil when the target
    ///     isn't built (skipped silently).
    public func apply(
        automation: [Studio.Automation],
        positionProvider: @escaping () -> Double,
        targetResolver: (String, Studio.AutomationTargetKind, Studio.AutomationParam) -> ((Double) -> Void)?,
    ) {
        // Preserve the caller's touch/latch suspensions across a
        // re-arm — the mixer keeps holding those envelopes.
        let carriedSuspensions = suspendedKeys
        cancel()
        suspendedKeys = carriedSuspensions
        self.positionProvider = positionProvider
        for entry in automation where !entry.points.isEmpty {
            switch entry.mode {
            case .off, .write:
                continue
            case .read, .touch, .latch:
                break
            }
            guard let writer = targetResolver(entry.target_id, entry.target_kind, entry.param) else {
                continue
            }
            let key = Self.envelopeKey(kind: entry.target_kind, id: entry.target_id, param: entry.param)
            // Prime with the value at the current transport position so
            // playback starts at the right level rather than jumping on
            // the first tick — but skip primed writes for suspended
            // envelopes so a live fader hold isn't yanked back.
            if !suspendedKeys.contains(key),
               let v = Studio.automationValueAt(points: entry.points, atSeconds: positionProvider())
            {
                writer(v)
            }
            active.append(Active(entry: entry, writer: writer, key: key))
        }
        if active.isEmpty { return }
        // Weak self so a stray extra tick after cancel() (rare — the
        // runloop can queue one late fire) can't retain us past
        // Engine dispose.
        timer = Timer.scheduledTimer(withTimeInterval: Self.tickInterval, repeats: true) { [weak self] _ in
            guard let self = self, let pp = self.positionProvider else { return }
            let pos = pp()
            for a in self.active {
                if self.suspendedKeys.contains(a.key) { continue }
                if let v = Studio.automationValueAt(points: a.entry.points, atSeconds: pos) {
                    a.writer(v)
                }
            }
        }
    }

    /// Mark an envelope as touched — subsequent ticks skip it so the
    /// mixer's live fader write is the sole source of truth.
    public func touch(
        kind: Studio.AutomationTargetKind,
        id: String,
        param: Studio.AutomationParam,
    ) {
        suspendedKeys.insert(Self.envelopeKey(kind: kind, id: id, param: param))
    }

    /// Release a previously-touched envelope. The scheduler resumes
    /// writing this envelope on the next tick.
    public func release(
        kind: Studio.AutomationTargetKind,
        id: String,
        param: Studio.AutomationParam,
    ) {
        suspendedKeys.remove(Self.envelopeKey(kind: kind, id: id, param: param))
    }

    /// Stop writing. Called on pause / stop / seek / dispose.
    /// Idempotent — safe to call when nothing is armed. Clears touch
    /// suspensions too since transport stop clears latch on the web
    /// side; the mixer will re-issue touches on the next Play.
    public func cancel() {
        timer?.invalidate()
        timer = nil
        active.removeAll()
        positionProvider = nil
        suspendedKeys.removeAll()
    }
}
