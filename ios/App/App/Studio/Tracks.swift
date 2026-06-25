// Track binding — owns the audio player / instrument node, a per-track
// strip (PanVol via AVAudioMixerNode), and the FX chain. Routes its
// output into the engine's master mixer.
//
// Audio tracks schedule each AudioClip into an AVAudioPlayerNode using
// sample-accurate `scheduleSegment(..., at:)`. MIDI tracks schedule
// note triggers against an EngineInstrument that wraps either a
// Sampler or a synth bank (see Instruments.swift).

import Foundation
import AVFoundation

public final class TrackBinding {
    public let trackId: String

    private let engine: AVAudioEngine
    private let master: AVAudioMixerNode
    private let strip: AVAudioMixerNode     // pan + vol
    private let muteGate: AVAudioMixerNode  // separate so we don't lose volume_db on mute
    private var fxChain: FxChain?
    private let kind: Studio.TrackKind

    // Audio-track resources.
    private var playerNodes: [AVAudioPlayerNode] = []
    private var loadedClips: [(clip: Studio.AudioClip, file: AVAudioFile, player: AVAudioPlayerNode)] = []

    // MIDI-track resources.
    private var instrument: EngineInstrument?
    private var midiClips: [Studio.MidiClip] = []
    private var midiTimers: [Timer] = []

    private init(trackId: String, kind: Studio.TrackKind,
                 engine: AVAudioEngine, master: AVAudioMixerNode,
                 strip: AVAudioMixerNode, muteGate: AVAudioMixerNode, fxChain: FxChain?) {
        self.trackId = trackId
        self.kind = kind
        self.engine = engine
        self.master = master
        self.strip = strip
        self.muteGate = muteGate
        self.fxChain = fxChain
    }

    public static func build(track: Studio.Track, engine: AVAudioEngine, master: AVAudioMixerNode,
                             assetLoader: AssetLoader, allAssets: [Studio.AudioAsset]) async throws -> TrackBinding {
        let strip = AVAudioMixerNode()
        let muteGate = AVAudioMixerNode()
        engine.attach(strip)
        engine.attach(muteGate)

        // Pull common track fields.
        let id: String
        let volumeDb: Double; let pan: Double; let mute: Bool
        let fxSpecs: [Studio.FxNode]; let kind: Studio.TrackKind

        switch track {
        case .audio(let t):
            id = t.id; volumeDb = t.volume_db; pan = t.pan; mute = t.mute; fxSpecs = t.fx; kind = .audio
        case .midi(let t):
            id = t.id; volumeDb = t.volume_db; pan = t.pan; mute = t.mute; fxSpecs = t.fx; kind = .midi
        }

        strip.outputVolume = Float(dbToGain(volumeDb))
        strip.pan = Float(pan)
        muteGate.outputVolume = mute ? 0 : 1

        // Wire strip → muteGate → fx chain (if any) → master.
        engine.connect(strip, to: muteGate, format: nil)
        let fxChain = FxChain.build(engine: engine, specs: fxSpecs)
        if let chain = fxChain {
            engine.connect(muteGate, to: chain.input, format: nil)
            engine.connect(chain.output, to: master, format: nil)
        } else {
            engine.connect(muteGate, to: master, format: nil)
        }

        let binding = TrackBinding(trackId: id, kind: kind, engine: engine, master: master,
                                   strip: strip, muteGate: muteGate, fxChain: fxChain)

        switch track {
        case .audio(let t):
            let assetMap = Dictionary(uniqueKeysWithValues: allAssets.map { ($0.id, $0) })
            for clip in t.clips {
                guard let asset = assetMap[clip.asset_id] else { continue }
                let file = try await assetLoader.loadAsset(id: asset.id, format: asset.format.rawValue)
                let player = AVAudioPlayerNode()
                engine.attach(player)
                engine.connect(player, to: strip, format: file.processingFormat)
                binding.playerNodes.append(player)
                binding.loadedClips.append((clip, file, player))
            }
        case .midi(let t):
            let inst = EngineInstrumentFactory.build(spec: t.instrument, engine: engine, destination: strip)
            binding.instrument = inst
            binding.midiClips = t.clips
        }

        return binding
    }

    // MARK: - Mixer strip

    public func setVolumeDb(_ db: Double) { strip.outputVolume = Float(dbToGain(db)) }
    public func setPan(_ p: Float) { strip.pan = max(-1, min(1, p)) }
    public func setMute(_ m: Bool) { muteGate.outputVolume = m ? 0 : 1 }

    // MARK: - Transport

    /// Schedule clips starting from `currentSeconds` against the engine's
    /// host-time anchor. Clips whose start is in the past relative to the
    /// current position are skipped or trimmed accordingly.
    public func startScheduling(from currentSeconds: Double, anchor: AVAudioTime) {
        switch kind {
        case .audio:
            for (clip, file, player) in loadedClips {
                let clipStart = clip.start_seconds
                let clipEnd = clipStart + clip.duration_seconds
                if clipEnd <= currentSeconds { continue }

                let trimSec = max(0, currentSeconds - clipStart)   // how much of the head we skip
                let playOffset = clip.offset_seconds + trimSec
                let playDuration = clip.duration_seconds - trimSec
                let sampleRate = file.processingFormat.sampleRate
                let startFrame = AVAudioFramePosition(playOffset * sampleRate)
                let frameCount = AVAudioFrameCount(playDuration * sampleRate)

                let when: AVAudioTime
                let secondsUntilStart = clipStart - currentSeconds
                if secondsUntilStart <= 0 {
                    when = anchor
                } else {
                    let offsetHost = AVAudioTime.hostTime(forSeconds: secondsUntilStart)
                    when = AVAudioTime(hostTime: anchor.hostTime + offsetHost)
                }

                player.scheduleSegment(file, startingFrame: startFrame, frameCount: frameCount,
                                       at: when, completionHandler: nil)
                player.play(at: when)
            }
        case .midi:
            guard let inst = instrument else { return }
            for clip in midiClips {
                for note in clip.notes {
                    let absStart = clip.start_seconds + note.start_seconds
                    if absStart < currentSeconds { continue }
                    let delay = absStart - currentSeconds
                    let timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { _ in
                        inst.trigger(pitch: note.pitch, durationSeconds: note.duration_seconds, velocity01: Double(note.velocity) / 127.0)
                    }
                    midiTimers.append(timer)
                }
            }
        }
    }

    public func stopScheduling() {
        for p in playerNodes { p.stop() }
        for t in midiTimers { t.invalidate() }
        midiTimers.removeAll()
    }

    public func dispose() {
        stopScheduling()
        for p in playerNodes {
            engine.disconnectNodeInput(p)
            engine.detach(p)
        }
        playerNodes.removeAll()
        loadedClips.removeAll()
        if let inst = instrument { inst.dispose() }
        fxChain?.dispose()
        engine.disconnectNodeInput(strip)
        engine.disconnectNodeInput(muteGate)
        engine.detach(strip)
        engine.detach(muteGate)
    }
}
