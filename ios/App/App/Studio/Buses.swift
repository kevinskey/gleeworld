// Buses — Swift mirror of src/lib/studio/engine/buses.ts.
//
// One user bus at runtime: a stereo submix that tracks (or other
// buses) route INTO via `strip`, and whose `output` node feeds the
// downstream target the session declares (another bus's strip, or
// the engine's masterMixer).
//
// Same graph mutation rules as TrackBinding: connections here are
// only safe while the AVAudioEngine is STOPPED. Engine.loadSession
// wraps the whole rebuild with a stop / restart pair.

import AVFoundation

public final class BusBinding {
    public let busId: String
    public var userMute = false
    public var userSolo = false

    private let engine: AVAudioEngine
    /// Input into this bus. Tracks / other buses connect their tail
    /// to `strip` when routed here.
    public let strip: AVAudioMixerNode      // pan + vol
    private let muteGate: AVAudioMixerNode  // 0/1 gain
    private var fxChain: FxChain?
    /// The last node in the bus's internal chain. Downstream targets
    /// (another bus's strip, or the engine's masterMixer) connect
    /// from THIS node. Engine.loadSession wires that link once every
    /// bus is built.
    public var output: AVAudioNode

    private init(busId: String,
                 engine: AVAudioEngine,
                 strip: AVAudioMixerNode,
                 muteGate: AVAudioMixerNode,
                 fxChain: FxChain?,
                 output: AVAudioNode)
    {
        self.busId = busId
        self.engine = engine
        self.strip = strip
        self.muteGate = muteGate
        self.fxChain = fxChain
        self.output = output
    }

    /// Attach + wire the bus's internal chain: strip → muteGate →
    /// [fx chain] → output. `output` is exposed on the returned
    /// binding so Engine.loadSession can wire it into whatever the
    /// bus's declared downstream target is (bus vs master).
    public static func build(bus: Studio.Bus, engine: AVAudioEngine) -> BusBinding {
        let strip = AVAudioMixerNode()
        let muteGate = AVAudioMixerNode()
        engine.attach(strip)
        engine.attach(muteGate)

        strip.outputVolume = Float(dbToGain(bus.volume_db))
        strip.pan = Float(bus.pan)
        muteGate.outputVolume = bus.mute ? 0 : 1

        engine.connect(strip, to: muteGate, format: nil)
        let fxChain = FxChain.build(engine: engine, specs: bus.fx)
        let tail: AVAudioNode
        if let chain = fxChain {
            engine.connect(muteGate, to: chain.input, format: nil)
            tail = chain.output
        } else {
            tail = muteGate
        }

        let binding = BusBinding(busId: bus.id, engine: engine,
                                 strip: strip, muteGate: muteGate,
                                 fxChain: fxChain, output: tail)
        binding.userMute = bus.mute
        binding.userSolo = bus.solo
        return binding
    }

    // MARK: - Live strip control (Phase 6-equivalent — bus strip
    // fader/pan/mute apply without a full engine rebuild).

    public func setVolumeDb(_ db: Double) { strip.outputVolume = Float(dbToGain(db)) }
    public func setPan(_ p: Float) { strip.pan = max(-1, min(1, p)) }
    public func setMute(_ m: Bool) { muteGate.outputVolume = m ? 0 : 1 }

    public func dispose() {
        // Order matches TrackBinding.dispose: detach nodes first,
        // then release the fx chain so nothing else references it.
        engine.detach(strip)
        engine.detach(muteGate)
        fxChain?.dispose()
        fxChain = nil
    }
}
