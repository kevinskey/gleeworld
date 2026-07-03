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

    /// User-intent flags. `setMute` drives the actual gate; these hold
    /// what the user asked for so the engine can compute the effective
    /// mute when any track is soloed (solo overrides mute on others).
    public var userMute = false
    public var userSolo = false

    private let engine: AVAudioEngine
    private let master: AVAudioMixerNode
    private let strip: AVAudioMixerNode     // pan + vol
    private let muteGate: AVAudioMixerNode  // separate so we don't lose volume_db on mute
    private var fxChain: FxChain?
    private let kind: Studio.TrackKind

    // Audio-track resources (push path — default).
    private var playerNodes: [AVAudioPlayerNode] = []
    private var loadedClips: [(clip: Studio.AudioClip, file: AVAudioFile, player: AVAudioPlayerNode)] = []

    // Audio-track resources (pull path — opt-in via Engine flag).
    // When `pullRenderer` is non-nil, the track's audio is driven by a
    // single AVAudioSourceNode whose render block sums pre-decoded
    // PCM buffers. Each clip lives in the renderer's snapshot rather
    // than as its own AVAudioPlayerNode.
    private var pullRenderer: PullRenderer?

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
        // solo intent is applied post-build by Engine.recomputeSolo().

        // Wire strip → muteGate → fx chain (if any) → master.
        //
        // NOTE: these connects are only safe while the engine is
        // STOPPED. Bulk-connecting chains of freshly attached mixers on
        // a running engine makes AVAudioEngine silently tear down
        // neighboring links (verified via graph dumps 2026-07-03: with
        // the engine live, `connect(muteGate → master)` dropped both
        // `strip → muteGate` and `masterMixer → mainMixerNode`, leaving
        // every track and the metronome bus disconnected — total
        // silence, no error). Engine.loadSession stops the engine
        // around the rebuild and restarts it after.
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
                // Some asset formats (notably .webm from older Chrome
                // recordings) can't be decoded by AVAudioFile. Skip the
                // clip rather than aborting the whole loadSession — the
                // user keeps all the OTHER tracks / clips working, and
                // the broken clip just doesn't play. Recordings post-
                // latency-trim are always WAV so this only affects
                // legacy data.
                let file: AVAudioFile
                do {
                    file = try await assetLoader.loadAsset(id: asset.id, format: asset.format.rawValue)
                } catch {
                    NSLog("[Studio] skipping clip \(clip.id) — asset \(asset.id) (.\(asset.format.rawValue)) failed to load: \(error.localizedDescription)")
                    continue
                }
                // Defensive: validate the file's format before passing
                // it to engine.connect. A bad sample rate or channel
                // layout would raise an Obj-C exception out of
                // AVAudioEngine.connect that Swift can't catch — so
                // we filter ahead of time and skip the clip instead
                // of taking the whole app down.
                let fmt = file.processingFormat
                guard fmt.sampleRate > 0 && fmt.channelCount > 0 else {
                    NSLog("[Studio] skipping clip \(clip.id) — invalid file format (sr=\(fmt.sampleRate), ch=\(fmt.channelCount))")
                    continue
                }
                let player = AVAudioPlayerNode()
                engine.attach(player)
                engine.connect(player, to: strip, format: fmt)
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

    /// End of the last clip on this track (seconds). 0 when empty.
    public func latestClipEnd() -> Double {
        var end: Double = 0
        for (clip, _, _) in loadedClips {
            end = max(end, clip.start_seconds + clip.duration_seconds)
        }
        for clip in midiClips {
            end = max(end, clip.start_seconds + clip.duration_seconds)
        }
        return end
    }

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
            NSLog("[Studio] track \(trackId) startScheduling \(loadedClips.count) clip(s) at pos=\(currentSeconds)")
            for (clip, file, player) in loadedClips {
                let clipStart = clip.start_seconds
                let clipEnd = clipStart + clip.duration_seconds
                if clipEnd <= currentSeconds {
                    NSLog("[Studio]   skip clip \(clip.id) — ended at \(clipEnd)")
                    continue
                }

                let trimSec = max(0, currentSeconds - clipStart)
                let playOffset = clip.offset_seconds + trimSec
                let playDuration = clip.duration_seconds - trimSec
                let sampleRate = file.processingFormat.sampleRate
                let startFrame = AVAudioFramePosition(playOffset * sampleRate)
                let frameCount = AVAudioFrameCount(max(0, playDuration * sampleRate))

                // Guard zero-length segments — AVAudioPlayerNode crashes
                // (signal abort) on scheduleSegment with frameCount=0.
                guard frameCount > 0 else {
                    NSLog("[Studio]   skip clip \(clip.id) — zero frame count")
                    continue
                }

                let when: AVAudioTime
                let secondsUntilStart = clipStart - currentSeconds
                if secondsUntilStart <= 0 {
                    when = anchor
                } else {
                    let offsetHost = AVAudioTime.hostTime(forSeconds: secondsUntilStart)
                    when = AVAudioTime(hostTime: anchor.hostTime + offsetHost)
                }

                // scheduleSegment + play(at:) can raise NSException on
                // format mismatch or wrong player state; both are
                // caught at the ObjC layer so one bad clip can't crash
                // the app.
                if let err = StudioObjC.catchExceptions({
                    player.scheduleSegment(file, startingFrame: startFrame, frameCount: frameCount,
                                           at: when, completionHandler: nil)
                    if !player.isPlaying { player.play(at: when) }
                }) {
                    NSLog("[Studio]   clip \(clip.id) schedule raised \(err.localizedDescription) — skipping")
                    continue
                }
                NSLog("[Studio]   clip \(clip.id) scheduled: startFrame=\(startFrame) frames=\(frameCount) sr=\(sampleRate)")
            }
        case .midi:
            guard let inst = instrument else { return }
            for clip in midiClips {
                for note in clip.notes {
                    let absStart = clip.start_seconds + note.start_seconds
                    if absStart < currentSeconds { continue }
                    let delay = absStart - currentSeconds
                    let timer = Timer(timeInterval: delay, repeats: false) { _ in
                        inst.trigger(pitch: note.pitch, durationSeconds: note.duration_seconds, velocity01: Double(note.velocity) / 127.0)
                    }
                    RunLoop.main.add(timer, forMode: .common)
                    midiTimers.append(timer)
                }
            }
        }
    }

    public func stopScheduling() {
        for p in playerNodes {
            p.stop()
            // AVAudioPlayerNode.stop() doesn't reliably clear the
            // scheduled-buffer queue across all iOS versions. Reset()
            // does — it forces the node to its no-playback state and
            // wipes anything queued.
            p.reset()
        }
        for t in midiTimers { t.invalidate() }
        midiTimers.removeAll()
    }

    // MARK: - Incremental clip add / remove
    //
    // Pair with the JS-side diff in useStudio.ts. The engine adds or
    // removes a single AVAudioPlayerNode on the live graph without
    // tearing down the rest of the session — the "stuck reloading"
    // state after a fresh recording goes away.

    /// Attach a new clip's player on the running graph. The asset file
    /// must already be decoded (Engine resolves the URL + loads the
    /// AVAudioFile before calling this). If the engine is currently
    /// playing, the new clip is scheduled against the live transport
    /// anchor so it joins playback at the correct position.
    public func addClip(clip: Studio.AudioClip, file: AVAudioFile,
                        currentSeconds: Double, anchor: AVAudioTime?) {
        // Skip if we already have a player for this clip id (caller is
        // expected to remove first when updating).
        if loadedClips.contains(where: { $0.clip.id == clip.id }) { return }

        let fmt = file.processingFormat
        guard fmt.sampleRate > 0 && fmt.channelCount > 0 else {
            NSLog("[Studio] incremental addClip skipped — bad format on \(clip.id)")
            return
        }
        let player = AVAudioPlayerNode()
        engine.attach(player)
        if let err = StudioObjC.catchExceptions({
            self.engine.connect(player, to: self.strip, format: fmt)
        }) {
            NSLog("[Studio] incremental connect failed for \(clip.id): \(err.localizedDescription)")
            engine.detach(player)
            return
        }
        playerNodes.append(player)
        loadedClips.append((clip, file, player))

        // If the transport is rolling, splice this clip into the current
        // pass so the user hears the just-added take in place.
        if let anchor = anchor, engine.isRunning {
            let clipStart = clip.start_seconds
            let clipEnd = clipStart + clip.duration_seconds
            if clipEnd > currentSeconds {
                let trimSec = max(0, currentSeconds - clipStart)
                let playOffset = clip.offset_seconds + trimSec
                let playDuration = clip.duration_seconds - trimSec
                let sampleRate = fmt.sampleRate
                let startFrame = AVAudioFramePosition(playOffset * sampleRate)
                let frameCount = AVAudioFrameCount(max(0, playDuration * sampleRate))
                if frameCount > 0 {
                    let when: AVAudioTime
                    let secondsUntilStart = clipStart - currentSeconds
                    if secondsUntilStart <= 0 {
                        when = anchor
                    } else {
                        let offsetHost = AVAudioTime.hostTime(forSeconds: secondsUntilStart)
                        when = AVAudioTime(hostTime: anchor.hostTime + offsetHost)
                    }
                    _ = StudioObjC.catchExceptions({
                        player.scheduleSegment(file, startingFrame: startFrame, frameCount: frameCount,
                                               at: when, completionHandler: nil)
                        if !player.isPlaying { player.play(at: when) }
                    })
                }
            }
        }
    }

    /// Remove a clip's player without touching the rest of the track.
    public func removeClip(clipId: String) {
        guard let idx = loadedClips.firstIndex(where: { $0.clip.id == clipId }) else { return }
        let entry = loadedClips[idx]
        entry.player.stop()
        engine.disconnectNodeInput(entry.player)
        engine.detach(entry.player)
        if let pidx = playerNodes.firstIndex(of: entry.player) {
            playerNodes.remove(at: pidx)
        }
        loadedClips.remove(at: idx)
    }

    public func hasClip(clipId: String) -> Bool {
        if let pr = pullRenderer { return pr.clipCount() > 0 && loadedClips.isEmpty }
        return loadedClips.contains(where: { $0.clip.id == clipId })
    }

    // MARK: - Pull-path wiring (opt-in)
    //
    // Engine calls enablePullRenderer(currentPositionProvider:) on a
    // fresh track to install a PullRenderer + AVAudioSourceNode into
    // the existing strip → muteGate → fx chain. Subsequent
    // addClipPullPath / removeClipPullPath calls flow through the
    // renderer's snapshot instead of attaching individual players.
    // No-op if already enabled.

    /// Install a PullRenderer for this track. Caller supplies a closure
    /// that returns the current transport position in seconds — the
    /// renderer reads it inside its render block to compute clip
    /// windows. `format` should match the master mixer's output format.
    public func enablePullRenderer(format: AVAudioFormat,
                                   currentPositionProvider: @escaping () -> Double) {
        guard pullRenderer == nil else { return }
        let renderer = PullRenderer(outputFormat: format,
                                    currentTimelineSeconds: currentPositionProvider)
        if let err = StudioObjC.catchExceptions({
            self.engine.attach(renderer.sourceNode)
            self.engine.connect(renderer.sourceNode, to: self.strip, format: format)
        }) {
            NSLog("[Studio] pullRenderer attach failed: \(err.localizedDescription)")
            return
        }
        pullRenderer = renderer
        NSLog("[Studio] pullRenderer wired on track \(trackId)")
    }

    /// Append a clip into the pull renderer. Caller has already decoded
    /// + converted the asset to master format via
    /// StudioAudioConverter.decodeAndConvertAsync (which runs on a
    /// background queue and avoids blocking the audio thread).
    public func addClipPullPath(clip: Studio.AudioClip, buffer: AVAudioPCMBuffer) {
        guard let renderer = pullRenderer else {
            NSLog("[Studio] addClipPullPath called but pullRenderer not enabled on \(trackId)")
            return
        }
        let prClip = PullRendererClip(
            id: clip.id,
            buffer: buffer,
            startSeconds: clip.start_seconds,
            durationSeconds: clip.duration_seconds,
            offsetSeconds: clip.offset_seconds,
            gainLinear: Float(dbToGain(clip.gain_db))
        )
        renderer.addClip(prClip)
    }

    public func removeClipPullPath(clipId: String) {
        pullRenderer?.removeClip(id: clipId)
    }

    public var isPullPathEnabled: Bool { pullRenderer != nil }

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
