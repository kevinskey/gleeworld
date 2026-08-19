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
    /// v2.0.0 — passthrough (unity gain) node BEFORE the strip fader.
    /// Sources connect here. Pre-fader sends read from this node so
    /// a fader drag doesn't scale the send level. Exposed so
    /// Engine.swift can wire sends fanning out from it.
    public let preFaderTap: AVAudioMixerNode
    private let strip: AVAudioMixerNode     // pan + vol
    private let muteGate: AVAudioMixerNode  // separate so we don't lose volume_db on mute
    /// v2.0.0 — post-fader tap point. Signal AFTER volume/pan/mute,
    /// BEFORE track FX. Post-fader sends fan out from here, which
    /// means muting the track silences post-fader sends too (matches
    /// the DAW convention).
    public var postFaderTap: AVAudioMixerNode { muteGate }
    private var fxChain: FxChain?
    /// Terminal node in the track's chain (post-FX if any, else the
    /// muteGate). Metering taps install here so the meter shows the
    /// post-processed signal the master bus receives.
    public var meterNode: AVAudioNode { fxChain?.output ?? muteGate }
    /// v2.0.0 — passthrough (unity) node between the FX tail (or
    /// muteGate when there is no FX) and the downstream target.
    /// Exists so setTrackOutput can safely disconnectNodeOutput
    /// on JUST this edge without touching the muteGate outputs
    /// (which post-fader sends may fan out from — see Sends.swift).
    /// routingGate never has any other outbound edge, so a
    /// disconnectNodeOutput on it is always the single track→bus
    /// edge and nothing else.
    public let routingGate: AVAudioMixerNode
    private let kind: Studio.TrackKind

    // Audio-track resources (push path — default).
    private var playerNodes: [AVAudioPlayerNode] = []
    private var loadedClips: [(clip: Studio.AudioClip, file: AVAudioFile, player: AVAudioPlayerNode)] = []
    /// Per-clip processed audio — clips that use gain / fades / reverse /
    /// time-stretch get their source window pre-rendered with those
    /// baked in (web-engine parity; the web side bakes them into the
    /// Tone.Player). Plain clips are absent here and keep the untouched
    /// scheduleSegment fast path. Keyed by clip id.
    private var processedBuffers: [String: AVAudioPCMBuffer] = [:]
    /// Per-clip source-consumption rate (1/time_stretch). 1.0 for
    /// unstretched clips. Used to convert timeline trims to source frames.
    private var clipRates: [String: Double] = [:]
    /// Varispeed inserted between player and preFaderTap for stretched
    /// clips (rate = 1/time_stretch — same semantics as the web engine's
    /// playbackRate: speed AND pitch shift together).
    private var stretchNodes: [String: AVAudioUnitVarispeed] = [:]
    /// Independent pitch shift for clip.pitch_semitones (web parity:
    /// Tone.PitchShift after the player). Chained after the varispeed
    /// when both are present.
    private var pitchNodes: [String: AVAudioUnitTimePitch] = [:]
    /// Aux nodes (varispeeds) whose clips were deleted on a live graph —
    /// parked for detach at dispose(), same policy as retiredPlayers.
    private var retiredAux: [AVAudioNode] = []
    /// Players whose clips were deleted while the engine was running.
    /// Detaching a node from a LIVE AVAudioEngine can sever neighboring
    /// graph links (same instability as the loadSession bulk-connect
    /// problem — device-reported as "deleted a clip and the sound
    /// stopped"). Deleted clips are stopped immediately (silent) and
    /// the node is physically detached later, in dispose(), when the
    /// graph is being torn down anyway.
    private var retiredPlayers: [AVAudioPlayerNode] = []

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
                 preFaderTap: AVAudioMixerNode,
                 strip: AVAudioMixerNode, muteGate: AVAudioMixerNode,
                 routingGate: AVAudioMixerNode, fxChain: FxChain?) {
        self.trackId = trackId
        self.kind = kind
        self.engine = engine
        self.master = master
        self.preFaderTap = preFaderTap
        self.strip = strip
        self.muteGate = muteGate
        self.routingGate = routingGate
        self.fxChain = fxChain
    }

    // MARK: - Per-clip processing (web-engine parity)

    /// Source-consumption rate for a clip: the web engine plays at
    /// playbackRate = 1/time_stretch, so a stretch of 2 consumes source
    /// half as fast (longer + lower). 1.0 when unset/invalid.
    static func clipPlaybackRate(_ clip: Studio.AudioClip) -> Double {
        return clip.time_stretch > 0 ? (1.0 / clip.time_stretch) : 1.0
    }

    /// True when the clip uses any per-clip feature the plain
    /// scheduleSegment path can't render.
    static func clipNeedsProcessing(_ clip: Studio.AudioClip) -> Bool {
        return abs(clip.gain_db) > 0.01
            || clip.fade_in_seconds > 0
            || clip.fade_out_seconds > 0
            || clip.reverse
            || abs(clipPlaybackRate(clip) - 1.0) > 0.001
    }

    /// Pre-render a clip's source window (offset → offset + duration·rate)
    /// with reverse, per-clip gain, and linear fade ramps baked in. Fade
    /// lengths are timeline seconds, converted to source frames so they
    /// occupy the right wall-clock span through a varispeed. Returns nil
    /// on extraction failure — caller falls back to unprocessed playback.
    static func processedBuffer(clip: Studio.AudioClip, file: AVAudioFile) -> AVAudioPCMBuffer? {
        let fmt = file.processingFormat
        let sr = fmt.sampleRate
        let rate = clipPlaybackRate(clip)
        let startFrame = AVAudioFramePosition(max(0, clip.offset_seconds) * sr)
        guard startFrame < file.length else { return nil }
        let wantFrames = AVAudioFrameCount(max(0, clip.duration_seconds * rate * sr))
        let frames = min(wantFrames, AVAudioFrameCount(file.length - startFrame))
        guard frames > 0, let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: frames) else { return nil }
        do {
            file.framePosition = startFrame
            try file.read(into: buf, frameCount: frames)
        } catch {
            NSLog("[Studio] processedBuffer read failed for \(clip.id): \(error.localizedDescription)")
            return nil
        }
        guard let ch = buf.floatChannelData else { return nil }
        let n = Int(buf.frameLength)
        let chCount = Int(fmt.channelCount)
        // Reverse first, then gain + fades, so the fades sit at the
        // PLAYBACK edges — same as the web engine.
        if clip.reverse {
            for c in 0..<chCount {
                let p = ch[c]
                var i = 0, j = n - 1
                while i < j { let t = p[i]; p[i] = p[j]; p[j] = t; i += 1; j -= 1 }
            }
        }
        let gain = Float(dbToGain(clip.gain_db))
        if abs(clip.gain_db) > 0.01 {
            for c in 0..<chCount {
                let p = ch[c]
                for k in 0..<n { p[k] *= gain }
            }
        }
        let fadeIn = min(n, Int(clip.fade_in_seconds * rate * sr))
        if fadeIn > 1 {
            for c in 0..<chCount {
                let p = ch[c]
                for k in 0..<fadeIn { p[k] *= Float(k) / Float(fadeIn) }
            }
        }
        let fadeOut = min(n, Int(clip.fade_out_seconds * rate * sr))
        if fadeOut > 1 {
            for c in 0..<chCount {
                let p = ch[c]
                for k in 0..<fadeOut { p[n - 1 - k] *= Float(k) / Float(fadeOut) }
            }
        }
        return buf
    }

    /// Copy of `src` from `from` to the end — AVAudioPlayerNode has no
    /// scheduleBuffer-with-offset, so mid-clip joins slice a fresh buffer.
    static func subBuffer(_ src: AVAudioPCMBuffer, from: AVAudioFrameCount) -> AVAudioPCMBuffer? {
        guard from < src.frameLength else { return nil }
        let frames = src.frameLength - from
        guard let dst = AVAudioPCMBuffer(pcmFormat: src.format, frameCapacity: frames),
              let s = src.floatChannelData, let d = dst.floatChannelData else { return nil }
        for c in 0..<Int(src.format.channelCount) {
            d[c].update(from: s[c] + Int(from), count: Int(frames))
        }
        dst.frameLength = frames
        return dst
    }

    /// Wire a clip's player into preFaderTap, inserting a varispeed when
    /// the clip is time-stretched and a time-pitch unit when it carries
    /// pitch_semitones (player → varispeed? → pitch? → preFaderTap).
    /// Registers processing state. Returns false when the graph connect
    /// raised (caller skips the clip).
    private func wireClipPlayer(_ player: AVAudioPlayerNode, clip: Studio.AudioClip,
                                file: AVAudioFile, fmt: AVAudioFormat) -> Bool {
        let rate = TrackBinding.clipPlaybackRate(clip)
        let err = StudioObjC.catchExceptions({
            var head: AVAudioNode = player
            if abs(rate - 1.0) > 0.001 {
                let vs = AVAudioUnitVarispeed()
                vs.rate = Float(rate)
                self.engine.attach(vs)
                self.engine.connect(head, to: vs, format: fmt)
                self.stretchNodes[clip.id] = vs
                head = vs
            }
            if abs(clip.pitch_semitones) > 0.001 {
                let tp = AVAudioUnitTimePitch()
                tp.pitch = Float(clip.pitch_semitones * 100)  // cents
                tp.rate = 1
                self.engine.attach(tp)
                self.engine.connect(head, to: tp, format: fmt)
                self.pitchNodes[clip.id] = tp
                head = tp
            }
            self.engine.connect(head, to: self.preFaderTap, format: fmt)
        })
        if let err = err {
            NSLog("[Studio] clip \(clip.id) connect raised \(err.localizedDescription)")
            if let vs = stretchNodes.removeValue(forKey: clip.id) {
                _ = StudioObjC.catchExceptions({ self.engine.detach(vs) })
            }
            if let tp = pitchNodes.removeValue(forKey: clip.id) {
                _ = StudioObjC.catchExceptions({ self.engine.detach(tp) })
            }
            return false
        }
        if TrackBinding.clipNeedsProcessing(clip) {
            if let pbuf = TrackBinding.processedBuffer(clip: clip, file: file) {
                processedBuffers[clip.id] = pbuf
                clipRates[clip.id] = rate
                NSLog("[Studio] clip \(clip.id) processed (gain=\(clip.gain_db) fadeIn=\(clip.fade_in_seconds) fadeOut=\(clip.fade_out_seconds) reverse=\(clip.reverse) rate=\(rate))")
            } else {
                NSLog("[Studio] clip \(clip.id) processing failed — playing unprocessed")
            }
        }
        return true
    }

    /// Schedule a processed clip buffer at `when`, trimming
    /// `trimSec` timeline-seconds off the front for mid-clip joins.
    /// Returns false when this clip has no processed buffer (caller
    /// uses the scheduleSegment fast path).
    private func scheduleProcessed(clip: Studio.AudioClip, player: AVAudioPlayerNode,
                                   trimSec: Double, when: AVAudioTime) -> Bool {
        guard let pbuf = processedBuffers[clip.id] else { return false }
        let rate = clipRates[clip.id] ?? 1.0
        let skip = AVAudioFrameCount(max(0, trimSec) * rate * pbuf.format.sampleRate)
        let toPlay: AVAudioPCMBuffer?
        if skip == 0 { toPlay = pbuf }
        else { toPlay = TrackBinding.subBuffer(pbuf, from: skip) }
        guard let seg = toPlay else { return true } // fully consumed — nothing to play
        if let err = StudioObjC.catchExceptions({
            player.scheduleBuffer(seg, at: when, options: [], completionHandler: nil)
            if !player.isPlaying { player.play(at: when) }
        }) {
            NSLog("[Studio] clip \(clip.id) processed schedule raised \(err.localizedDescription)")
        }
        return true
    }

    public static func build(track: Studio.Track, engine: AVAudioEngine, master: AVAudioMixerNode,
                             assetLoader: AssetLoader, allAssets: [Studio.AudioAsset]) async throws -> TrackBinding {
        // v2.0.0 signal path:
        //   source → preFaderTap (unity) → strip → muteGate → fx → master
        // preFaderTap is a passthrough on the main signal path; only
        // sends fan out from it. Audible output is identical to the
        // pre-v2 wiring.
        let preFaderTap = AVAudioMixerNode()
        let strip = AVAudioMixerNode()
        let muteGate = AVAudioMixerNode()
        let routingGate = AVAudioMixerNode()
        engine.attach(preFaderTap)
        engine.attach(strip)
        engine.attach(muteGate)
        engine.attach(routingGate)

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
        engine.connect(preFaderTap, to: strip, format: nil)
        engine.connect(strip, to: muteGate, format: nil)
        let fxChain = FxChain.build(engine: engine, specs: fxSpecs)
        // Terminal-of-chain feeds routingGate; routingGate then goes
        // to the declared downstream target (master or a bus's strip).
        // Splitting the last hop through routingGate gives setTrackOutput
        // a clean single edge to disconnect without touching muteGate
        // (which may fan out to post-fader sends).
        if let chain = fxChain {
            engine.connect(muteGate, to: chain.input, format: nil)
            engine.connect(chain.output, to: routingGate, format: nil)
        } else {
            engine.connect(muteGate, to: routingGate, format: nil)
        }
        engine.connect(routingGate, to: master, format: nil)

        let binding = TrackBinding(trackId: id, kind: kind, engine: engine, master: master,
                                   preFaderTap: preFaderTap,
                                   strip: strip, muteGate: muteGate,
                                   routingGate: routingGate, fxChain: fxChain)

        switch track {
        case .audio(let t):
            let assetMap = Dictionary(uniqueKeysWithValues: allAssets.map { ($0.id, $0) })
            NSLog("[Studio.build] audio track \(id): \(t.clips.count) clips")
            for clip in t.clips {
                guard let asset = assetMap[clip.asset_id] else { NSLog("[Studio.build] clip \(clip.id): asset \(clip.asset_id) not in map — skip"); continue }
                NSLog("[Studio.build] clip \(clip.id): loading asset \(asset.id) (.\(asset.format.rawValue)) …")
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
                NSLog("[Studio.build] clip \(clip.id): loaded (sr=\(fmt.sampleRate) ch=\(fmt.channelCount)); attaching+connecting player")
                let player = AVAudioPlayerNode()
                engine.attach(player)
                // v2.0.0 — connect to preFaderTap so pre-fader sends
                // see the raw source (via a varispeed for stretched
                // clips). preFaderTap → strip preserves the pre-v2
                // audible signal path.
                guard binding.wireClipPlayer(player, clip: clip, file: file, fmt: fmt) else {
                    engine.detach(player)
                    continue
                }
                binding.playerNodes.append(player)
                binding.loadedClips.append((clip, file, player))
                NSLog("[Studio.build] clip \(clip.id): player connected")
            }
        case .midi(let t):
            let inst = EngineInstrumentFactory.build(spec: t.instrument, engine: engine, destination: preFaderTap)
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

    /// Live-apply changed FX params to this track's chain (no rebuild).
    @discardableResult
    public func applyFxParam(fxId: String, spec: Studio.FxNode) -> Bool {
        return fxChain?.setParams(fxId: fxId, spec: spec) ?? false
    }

    /// Live enable/disable an effect on this track (bypass flip, no rebuild).
    @discardableResult
    public func setFxBypass(fxId: String, on: Bool) -> Bool {
        return fxChain?.setBypass(fxId: fxId, on: on) ?? false
    }

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

                // Clips with gain / fades / reverse / stretch play their
                // pre-processed buffer instead of the raw file segment.
                if scheduleProcessed(clip: clip, player: player, trimSec: trimSec, when: when) {
                    NSLog("[Studio]   clip \(clip.id) scheduled (processed)")
                    continue
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
        // v2.0.0 — connect via preFaderTap so incremental clip-add
        // follows the same pre-fader-send-visible path as loadSession.
        // wireClipPlayer also inserts a varispeed for stretched clips
        // and pre-renders gain/fades/reverse into a processed buffer.
        guard wireClipPlayer(player, clip: clip, file: file, fmt: fmt) else {
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
                    if !scheduleProcessed(clip: clip, player: player, trimSec: trimSec, when: when) {
                        _ = StudioObjC.catchExceptions({
                            player.scheduleSegment(file, startingFrame: startFrame, frameCount: frameCount,
                                                   at: when, completionHandler: nil)
                            if !player.isPlaying { player.play(at: when) }
                        })
                    }
                }
            }
        }
    }

    /// Remove a clip's player without touching the rest of the track.
    /// See `retiredPlayers` — the node is only detached immediately when
    /// the engine is stopped; on a live graph it is stopped (silent) and
    /// parked for detach at dispose() time.
    public func removeClip(clipId: String) {
        guard let idx = loadedClips.firstIndex(where: { $0.clip.id == clipId }) else { return }
        let entry = loadedClips[idx]
        if let err = StudioObjC.catchExceptions({ entry.player.stop() }) {
            NSLog("[Studio] removeClip stop raised \(err.localizedDescription)")
        }
        let aux: [AVAudioNode] = [stretchNodes.removeValue(forKey: clipId),
                                  pitchNodes.removeValue(forKey: clipId)].compactMap { $0 }
        if engine.isRunning {
            retiredPlayers.append(entry.player)
            retiredAux.append(contentsOf: aux)
        } else {
            engine.disconnectNodeInput(entry.player)
            engine.detach(entry.player)
            for n in aux {
                engine.disconnectNodeInput(n)
                engine.detach(n)
            }
        }
        if let pidx = playerNodes.firstIndex(of: entry.player) {
            playerNodes.remove(at: pidx)
        }
        loadedClips.remove(at: idx)
        processedBuffers.removeValue(forKey: clipId)
        clipRates.removeValue(forKey: clipId)
    }

    /// Re-assert this track's mixer chain. If a live-graph mutation
    /// severed strip → muteGate or muteGate → master, every clip on the
    /// track goes silent with no error; play() calls this as a cheap
    /// self-heal. Only runs for tracks that actually hold clips —
    /// zero-input mixers get pruned from the active render graph and
    /// legitimately report no output connection.
    public func verifyWiring() {
        guard !loadedClips.isEmpty || instrument != nil else { return }
        if engine.outputConnectionPoints(for: strip, outputBus: 0).isEmpty {
            NSLog("[Studio] track \(trackId): strip output severed — rewiring")
            if let err = StudioObjC.catchExceptions({
                self.engine.connect(self.strip, to: self.muteGate, format: nil)
            }) { NSLog("[Studio] strip rewire raised \(err.localizedDescription)") }
        }
        if engine.outputConnectionPoints(for: muteGate, outputBus: 0).isEmpty {
            NSLog("[Studio] track \(trackId): muteGate output severed — rewiring")
            if let err = StudioObjC.catchExceptions({
                if let chain = self.fxChain {
                    self.engine.connect(self.muteGate, to: chain.input, format: nil)
                } else {
                    self.engine.connect(self.muteGate, to: self.master, format: nil)
                }
            }) { NSLog("[Studio] muteGate rewire raised \(err.localizedDescription)") }
        }
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
        // Fades / reverse parity with the push path: bake them into a
        // copy of the clip's window (the source buffer may be shared via
        // AudioBufferCache — never mutate it). Gain stays on gainLinear;
        // the renderer applies it. Time-stretch is not supported on the
        // pull path (it sums at a fixed rate) — logged, not silent.
        var prBuffer = buffer
        var prOffset = clip.offset_seconds
        if clip.fade_in_seconds > 0 || clip.fade_out_seconds > 0 || clip.reverse {
            if let win = TrackBinding.processedWindow(clip: clip, source: buffer) {
                prBuffer = win
                prOffset = 0
            } else {
                NSLog("[Studio] pull-path processing failed for \(clip.id) — playing unprocessed")
            }
        }
        if abs(TrackBinding.clipPlaybackRate(clip) - 1.0) > 0.001 {
            NSLog("[Studio] pull-path clip \(clip.id): time_stretch unsupported on pull renderer — ignored")
        }
        if abs(clip.pitch_semitones) > 0.001 {
            NSLog("[Studio] pull-path clip \(clip.id): pitch_semitones unsupported on pull renderer — ignored")
        }
        let prClip = PullRendererClip(
            id: clip.id,
            buffer: prBuffer,
            startSeconds: clip.start_seconds,
            durationSeconds: clip.duration_seconds,
            offsetSeconds: prOffset,
            gainLinear: Float(dbToGain(clip.gain_db))
        )
        renderer.addClip(prClip)
    }

    /// Pull-path variant of processedBuffer: extract the clip window
    /// from an in-memory source buffer and bake reverse + fade ramps
    /// (no gain — PullRenderer applies gainLinear itself; no stretch —
    /// unsupported on this path).
    static func processedWindow(clip: Studio.AudioClip, source: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
        let sr = source.format.sampleRate
        let startFrame = AVAudioFrameCount(max(0, clip.offset_seconds) * sr)
        guard startFrame < source.frameLength else { return nil }
        let wantFrames = AVAudioFrameCount(max(0, clip.duration_seconds * sr))
        let frames = min(wantFrames, source.frameLength - startFrame)
        guard frames > 0,
              let buf = AVAudioPCMBuffer(pcmFormat: source.format, frameCapacity: frames),
              let s = source.floatChannelData, let d = buf.floatChannelData else { return nil }
        let chCount = Int(source.format.channelCount)
        for c in 0..<chCount { d[c].update(from: s[c] + Int(startFrame), count: Int(frames)) }
        buf.frameLength = frames
        let n = Int(frames)
        if clip.reverse {
            for c in 0..<chCount {
                let p = d[c]
                var i = 0, j = n - 1
                while i < j { let t = p[i]; p[i] = p[j]; p[j] = t; i += 1; j -= 1 }
            }
        }
        let fadeIn = min(n, Int(clip.fade_in_seconds * sr))
        if fadeIn > 1 {
            for c in 0..<chCount {
                let p = d[c]
                for k in 0..<fadeIn { p[k] *= Float(k) / Float(fadeIn) }
            }
        }
        let fadeOut = min(n, Int(clip.fade_out_seconds * sr))
        if fadeOut > 1 {
            for c in 0..<chCount {
                let p = d[c]
                for k in 0..<fadeOut { p[n - 1 - k] *= Float(k) / Float(fadeOut) }
            }
        }
        return buf
    }

    public func removeClipPullPath(clipId: String) {
        pullRenderer?.removeClip(id: clipId)
    }

    public var isPullPathEnabled: Bool { pullRenderer != nil }

    public func dispose() {
        stopScheduling()
        // Graph teardown can raise an ObjC NSException out of
        // AVAudioEngine.disconnectNodeInput/detach when a node is already
        // detached or the engine is mid-teardown. Swift's do/catch can't
        // catch it, so an uncaught throw here ABORTS the app — this was the
        // SIGABRT via disconnectNodeInput on the Capacitor bridge queue
        // (build 140, triggered by a gain/FX change → stopEngine → dispose).
        // Wrap the graph ops in the ObjC catcher so a stale node degrades to
        // a no-op instead of crashing; the Swift-side bookkeeping (clearing
        // arrays) always runs afterward.
        if let err = StudioObjC.catchExceptions({
            for p in self.playerNodes {
                self.engine.disconnectNodeInput(p)
                self.engine.detach(p)
            }
            for p in self.retiredPlayers {
                self.engine.disconnectNodeInput(p)
                self.engine.detach(p)
            }
            for vs in self.stretchNodes.values {
                self.engine.disconnectNodeInput(vs)
                self.engine.detach(vs)
            }
            for tp in self.pitchNodes.values {
                self.engine.disconnectNodeInput(tp)
                self.engine.detach(tp)
            }
            for n in self.retiredAux {
                self.engine.disconnectNodeInput(n)
                self.engine.detach(n)
            }
            self.instrument?.dispose()
            self.fxChain?.dispose()
            self.engine.disconnectNodeInput(self.preFaderTap)
            self.engine.disconnectNodeInput(self.strip)
            self.engine.disconnectNodeInput(self.muteGate)
            self.engine.disconnectNodeInput(self.routingGate)
            self.engine.detach(self.preFaderTap)
            self.engine.detach(self.strip)
            self.engine.detach(self.muteGate)
            self.engine.detach(self.routingGate)
        }) {
            NSLog("[Studio] TrackBinding.dispose teardown raised (ignored): \(err.localizedDescription)")
        }
        retiredPlayers.removeAll()
        playerNodes.removeAll()
        loadedClips.removeAll()
        stretchNodes.removeAll()
        pitchNodes.removeAll()
        retiredAux.removeAll()
        processedBuffers.removeAll()
        clipRates.removeAll()
    }
}
