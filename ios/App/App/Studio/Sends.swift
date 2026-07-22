// Sends — Swift mirror of src/lib/studio/engine/sends.ts.
//
// One send at runtime: a Gain node (AVAudioMixerNode with adjustable
// output volume) that taps off a source track's pre- or post-fader
// point and feeds the target bus's `strip` (input) node.
//
// Disabled sends are baked as gain=0 so the graph shape doesn't
// change when the user flips enabled — matches how bypassed FX are
// already handled. Live level edits go through updateLevel(dB),
// which writes to the mixer's `outputVolume` without touching graph
// topology.
//
// Sends aren't rebuilt for level edits; only structural changes
// (add / remove / target-bus / pre-fader / enabled) trigger a
// loadSession full rebuild, matching the skeleton-diff policy on
// the web engine.

import AVFoundation

public final class SendBinding {
    public let sendId: String
    public let sourceTrackId: String
    public let targetBusId: String
    public let preFader: Bool
    public let enabled: Bool

    private let engine: AVAudioEngine
    private let gainNode: AVAudioMixerNode
    private let source: AVAudioNode
    private let target: AVAudioMixerNode

    private init(sendId: String, sourceTrackId: String, targetBusId: String,
                 preFader: Bool, enabled: Bool,
                 engine: AVAudioEngine, gainNode: AVAudioMixerNode,
                 source: AVAudioNode, target: AVAudioMixerNode) {
        self.sendId = sendId
        self.sourceTrackId = sourceTrackId
        self.targetBusId = targetBusId
        self.preFader = preFader
        self.enabled = enabled
        self.engine = engine
        self.gainNode = gainNode
        self.source = source
        self.target = target
    }

    /// Wire one send: source (pre- or post-fader tap) → gainNode →
    /// target bus input. Disabled sends are baked as gain=0 so a
    /// toggle is a param change, not a graph rebuild.
    public static func build(spec: Studio.Send, sourceTrackId: String,
                             source: AVAudioNode, target: AVAudioMixerNode,
                             engine: AVAudioEngine) -> SendBinding {
        let gain = AVAudioMixerNode()
        engine.attach(gain)
        gain.outputVolume = spec.enabled ? Float(dbToGain(spec.level_db)) : 0

        // A source can connect to multiple destinations by using the
        // AVAudioEngine.connect(_:to:fromBus:toBus:format:) shape once
        // per destination — the main-path connection to strip/muteGate
        // was already made by TrackBinding.build; this fan-out is a
        // second edge from the same source node.
        engine.connect(source, to: gain, format: nil)
        engine.connect(gain, to: target, format: nil)

        return SendBinding(
            sendId: spec.id, sourceTrackId: sourceTrackId,
            targetBusId: spec.target_bus_id,
            preFader: spec.pre_fader, enabled: spec.enabled,
            engine: engine, gainNode: gain,
            source: source, target: target)
    }

    /// Live level-only edit. Writes to the mixer's outputVolume
    /// directly — no graph topology change, no clip re-schedule.
    /// A disabled send stays at gain=0 regardless of levelDb; the
    /// enable flag is structural and requires a loadSession rebuild.
    public func updateLevel(_ levelDb: Double) {
        gainNode.outputVolume = enabled ? Float(dbToGain(levelDb)) : 0
    }

    public func dispose() {
        _ = StudioObjC.catchExceptions {
            self.engine.disconnectNodeInput(self.gainNode)
            self.engine.detach(self.gainNode)
        }
    }
}
