// Native FX chain — maps each FxType in the session schema to an
// AVAudioUnit. Built-in iOS units cover EQ/Reverb/Delay/Distortion.
// Compressor + Filter use AVAudioUnitEffect subclasses (DynamicsProcessor
// at the AU level, lowpass band of AVAudioUnitEQ for filter).
//
// `FxChain.build` chains the nodes in series and returns the head + tail
// the engine wires into the parent mixer.

import Foundation
import AVFoundation

public final class FxChain {
    public let input: AVAudioNode
    public let output: AVAudioNode
    public let nodes: [FxNodeBinding]

    private let engine: AVAudioEngine

    private init(engine: AVAudioEngine, input: AVAudioNode, output: AVAudioNode, nodes: [FxNodeBinding]) {
        self.engine = engine
        self.input = input
        self.output = output
        self.nodes = nodes
    }

    /// Returns nil if specs is empty — caller should just wire input→output directly.
    public static func build(engine: AVAudioEngine, specs: [Studio.FxNode]) -> FxChain? {
        let enabled = specs.filter { $0.enabled }
        guard !enabled.isEmpty else { return nil }

        var bindings: [FxNodeBinding] = []
        for spec in enabled {
            let b = FxNodeBinding.build(engine: engine, spec: spec)
            bindings.append(b)
        }
        // Chain them in series.
        for i in 0..<(bindings.count - 1) {
            engine.connect(bindings[i].node, to: bindings[i + 1].node, format: nil)
        }
        return FxChain(
            engine: engine,
            input: bindings.first!.node,
            output: bindings.last!.node,
            nodes: bindings)
    }

    public func dispose() {
        for n in nodes {
            engine.disconnectNodeInput(n.node)
            engine.detach(n.node)
        }
    }
}

public final class FxNodeBinding {
    public let type: String
    public let node: AVAudioNode

    init(type: String, node: AVAudioNode) {
        self.type = type
        self.node = node
    }

    public static func build(engine: AVAudioEngine, spec: Studio.FxNode) -> FxNodeBinding {
        let node: AVAudioNode
        switch spec.type {
        case .gain:
            // AVAudioEngine has no dedicated gain node; an EQ with all
            // bands flat and a globalGain shift acts as one.
            let eq = AVAudioUnitEQ(numberOfBands: 1)
            eq.globalGain = paramFloat(spec.params, "gain_db", 0)
            node = eq
        case .eq3:
            let eq = AVAudioUnitEQ(numberOfBands: 3)
            eq.bands[0].filterType = .lowShelf
            eq.bands[0].frequency = 200
            eq.bands[0].gain = paramFloat(spec.params, "low_db", 0)
            eq.bands[0].bypass = false
            eq.bands[1].filterType = .parametric
            eq.bands[1].frequency = paramFloat(spec.params, "mid_hz", 1000)
            eq.bands[1].bandwidth = 1.0
            eq.bands[1].gain = paramFloat(spec.params, "mid_db", 0)
            eq.bands[1].bypass = false
            eq.bands[2].filterType = .highShelf
            eq.bands[2].frequency = 5000
            eq.bands[2].gain = paramFloat(spec.params, "high_db", 0)
            eq.bands[2].bypass = false
            node = eq
        case .compressor:
            // AVAudioUnitDynamicsProcessor is the high-level wrapper.
            let dyn = AVAudioUnitEffect(audioComponentDescription: .init(
                componentType: kAudioUnitType_Effect,
                componentSubType: kAudioUnitSubType_DynamicsProcessor,
                componentManufacturer: kAudioUnitManufacturer_Apple,
                componentFlags: 0, componentFlagsMask: 0))
            // Param setting via AudioUnit indices — see Apple's DynamicsProcessor IDs.
            // 0 Threshold (dB), 1 HeadRoom, 2 ExpansionRatio, 3 ExpansionThreshold,
            // 4 AttackTime, 5 ReleaseTime, 6 MasterGain.
            AudioUnitSetParameter(dyn.audioUnit, 0, kAudioUnitScope_Global, 0,
                                  paramFloat(spec.params, "threshold_db", -18), 0)
            AudioUnitSetParameter(dyn.audioUnit, 6, kAudioUnitScope_Global, 0,
                                  paramFloat(spec.params, "makeup_db", 0), 0)
            // Attack/release in seconds.
            AudioUnitSetParameter(dyn.audioUnit, 4, kAudioUnitScope_Global, 0,
                                  paramFloat(spec.params, "attack_ms", 5) / 1000.0, 0)
            AudioUnitSetParameter(dyn.audioUnit, 5, kAudioUnitScope_Global, 0,
                                  paramFloat(spec.params, "release_ms", 80) / 1000.0, 0)
            node = dyn
        case .reverb:
            let rev = AVAudioUnitReverb()
            rev.loadFactoryPreset(.mediumHall)
            rev.wetDryMix = paramFloat(spec.params, "wet", 0.25) * 100
            node = rev
        case .delay:
            let del = AVAudioUnitDelay()
            del.delayTime = TimeInterval(paramFloat(spec.params, "time_ms", 350) / 1000.0)
            del.feedback = paramFloat(spec.params, "feedback", 0.35) * 100
            del.wetDryMix = paramFloat(spec.params, "wet", 0.25) * 100
            node = del
        case .filter:
            // A single-band EQ acts as a high/low/band filter.
            let eq = AVAudioUnitEQ(numberOfBands: 1)
            let band = eq.bands[0]
            let kind = paramString(spec.params, "kind", "low")
            switch kind {
            case "low":  band.filterType = .lowPass
            case "high": band.filterType = .highPass
            case "band": band.filterType = .bandPass
            default:     band.filterType = .lowPass
            }
            band.frequency = paramFloat(spec.params, "cutoff_hz", 1000)
            band.bandwidth = max(0.1, paramFloat(spec.params, "q", 0.7))
            band.bypass = false
            node = eq
        }
        engine.attach(node)
        return FxNodeBinding(type: spec.type.rawValue, node: node)
    }
}

// ── Param accessors ──────────────────────────────────────────────────

func paramFloat(_ p: [String: Studio.ParamValue], _ key: String, _ fallback: Float) -> Float {
    guard case .number(let v) = p[key] else { return fallback }
    return Float(v)
}
func paramString(_ p: [String: Studio.ParamValue], _ key: String, _ fallback: String) -> String {
    guard case .string(let v) = p[key] else { return fallback }
    return v
}
func paramBool(_ p: [String: Studio.ParamValue], _ key: String, _ fallback: Bool) -> Bool {
    guard case .bool(let v) = p[key] else { return fallback }
    return v
}
