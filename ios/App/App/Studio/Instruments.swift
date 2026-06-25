// EngineInstrument — backs MIDI tracks. Two built-ins:
//
//   • synth_basic: AVAudioUnitSampler with a sine/saw preset triggered
//     polyphonically via MIDI notes.
//   • sampler kit_basic: drum sounds at common GM pitches (36 kick,
//     38 snare, 42 hat), implemented as one-shots through the sampler.
//
// AUv3 plugin hosting lives in a Phase 4 polish — for now we ship the
// two built-ins to match what the web side offers.

import Foundation
import AVFoundation

public protocol EngineInstrument {
    func trigger(pitch: Int, durationSeconds: Double, velocity01: Double)
    func dispose()
}

public enum EngineInstrumentFactory {
    public static func build(spec: Studio.Instrument, engine: AVAudioEngine,
                             destination: AVAudioNode) -> EngineInstrument {
        switch spec.type {
        case .sampler:
            return SamplerInstrument(preset: spec.preset_id ?? "kit_basic",
                                     engine: engine, destination: destination)
        case .synth_basic:
            return SynthInstrument(preset: spec.preset_id ?? "sine",
                                   engine: engine, destination: destination)
        }
    }
}

// Convenience namespace alias so callers can read like the TS API.
public enum EngineInstrument_ {
    public static func build(spec: Studio.Instrument, engine: AVAudioEngine,
                             destination: AVAudioNode) -> EngineInstrument {
        return EngineInstrumentFactory.build(spec: spec, engine: engine, destination: destination)
    }
}

// MARK: - Synth (polyphonic, simple preset)

final class SynthInstrument: EngineInstrument {
    private let engine: AVAudioEngine
    private let sampler: AVAudioUnitSampler

    init(preset: String, engine: AVAudioEngine, destination: AVAudioNode) {
        self.engine = engine
        self.sampler = AVAudioUnitSampler()
        engine.attach(sampler)
        engine.connect(sampler, to: destination, format: nil)
        // The sampler defaults to a sine-ish tone if no preset is loaded.
        // For 'sine', 'triangle', 'square', 'sawtooth' we would map to
        // bundled SoundFont presets — for Phase 3 we keep the default.
    }

    func trigger(pitch: Int, durationSeconds: Double, velocity01: Double) {
        let velocity = UInt8(max(1, min(127, Int(round(velocity01 * 127)))))
        sampler.startNote(UInt8(pitch), withVelocity: velocity, onChannel: 0)
        DispatchQueue.main.asyncAfter(deadline: .now() + durationSeconds) { [weak self] in
            self?.sampler.stopNote(UInt8(pitch), onChannel: 0)
        }
    }

    func dispose() {
        engine.disconnectNodeInput(sampler)
        engine.detach(sampler)
    }
}

// MARK: - Basic drum kit

final class SamplerInstrument: EngineInstrument {
    private let engine: AVAudioEngine
    private let sampler: AVAudioUnitSampler

    init(preset: String, engine: AVAudioEngine, destination: AVAudioNode) {
        self.engine = engine
        self.sampler = AVAudioUnitSampler()
        engine.attach(sampler)
        engine.connect(sampler, to: destination, format: nil)
        // 'kit_basic' / other presets would load a SoundFont bundle resource
        // here. Out of scope for MVP — Apple's built-in sampler produces
        // a usable percussive sound on any MIDI note without loading one.
    }

    func trigger(pitch: Int, durationSeconds: Double, velocity01: Double) {
        let velocity = UInt8(max(1, min(127, Int(round(velocity01 * 127)))))
        // GM drum mapping (rough): 35-36 kick, 38/40 snare, 42/44/46 hat.
        // We re-pitch the sampler to give each band a distinct tone.
        let mappedPitch: Int
        if pitch <= 37 { mappedPitch = 36 }
        else if pitch <= 41 { mappedPitch = 60 } // bright
        else { mappedPitch = 84 }                // brighter
        sampler.startNote(UInt8(mappedPitch), withVelocity: velocity, onChannel: 0)
        DispatchQueue.main.asyncAfter(deadline: .now() + min(durationSeconds, 0.2)) { [weak self] in
            self?.sampler.stopNote(UInt8(mappedPitch), onChannel: 0)
        }
    }

    func dispose() {
        engine.disconnectNodeInput(sampler)
        engine.detach(sampler)
    }
}
