// GleeWorld Studio — native AVAudioEngine wrapper.
//
// One Engine instance per Studio editor mount. Owns the audio session
// configuration, the AVAudioEngine, the master mixer, the transport
// clock, and all tracks. The Capacitor plugin holds the singleton and
// forwards JS calls into here.
//
// Phase 3 scope mirrors Phase 2's web engine: load a Session, schedule
// audio + MIDI clips, play/pause/seek/stop. Manual rendering mode for
// mixdown ships separately (Mixdown.swift).

import Foundation
import AVFoundation

/// Snapshot of engine state. Sent to JS via Capacitor `notifyListeners`.
public struct StudioEngineState {
    public var isReady: Bool
    public var isPlaying: Bool
    public var positionSeconds: Double
    public var tempoBpm: Double
    public var metronomeOn: Bool
}

public final class StudioNativeEngine {
    // AVAudioEngine() and AVAudioMixerNode() both touch CoreAudio at
    // construction time and have been observed to crash when the audio
    // session isn't fully established yet. Since the plugin is now
    // registered at app launch (MainViewController.capacitorDidLoad)
    // these MUST be lazy — they're built on first access from `start()`,
    // by which time the audio session has been configured.
    private lazy var engine = AVAudioEngine()
    private lazy var masterMixer = AVAudioMixerNode()
    /// FX chain inserted in front of the engine's main output mixer.
    /// The masterMixer feeds the first FX node; the last FX node feeds
    /// the engine's `mainMixerNode`, which is connected to the output.
    private var masterFxChain: FxChain?
    private var tracks: [String: TrackBinding] = [:]

    /// Session currently bound. Read-only after loadSession; structural
    /// edits require a fresh loadSession.
    private(set) var session: Studio.Session?

    /// The audio render clock. AVAudioEngine doesn't expose a transport
    /// of its own, so we keep an explicit `startHostTime` + `pausedAt`
    /// pair and compute the position on demand.
    private var startHostTime: AVAudioTime?
    private var pausedAt: Double = 0
    private var isPlayingNow: Bool = false

    /// Position-tick callback bridged to JS via the plugin.
    public var onState: ((StudioEngineState) -> Void)?
    private var positionTimer: Timer?

    // Metronome — short square-wave clicks scheduled per beat between
    // `pausedAt` and `session.length_seconds`. Routed through a dedicated
    // AVAudioPlayerNode → master mixer so it shares the master FX/output
    // path but bypasses the per-track strips.
    private var metronomeOn: Bool = false
    private var metronomeVolume: Float = 0.7
    private lazy var metronomePlayer = AVAudioPlayerNode()
    private var metronomeAttached = false
    private var metronomeTimers: [Timer] = []
    // Click buffers built lazily in the masterMixer's output format so
    // the buffer's channel count + sample rate matches what the engine
    // expects. A mono 44.1kHz buffer fed into a stereo bus silently
    // drops on AVAudioPlayerNode — no error, just silence.
    private var metronomeBeatBuffer: AVAudioPCMBuffer?
    private var metronomeAccentBuffer: AVAudioPCMBuffer?

    /// True once the master mixer has been connected to the engine's
    /// main output node. We defer that connection out of init() because
    /// accessing `engine.mainMixerNode` triggers default output routing,
    /// which can crash the app if no audio session is active yet. The
    /// plugin is now registered at app launch, so init() runs before
    /// anything has set up CoreAudio.
    private var masterConnected = false

    public init() {
        // Empty by design. AVAudioEngine + AVAudioMixerNode are now
        // `lazy var`, so we don't allocate them until start() runs.
        // Anything we did here would defeat the lazy-init contract.
    }

    // MARK: - Lifecycle

    public func start() throws {
        NSLog("[Studio] engine.start: enter")
        // Every AVAudioEngine call below can raise a raw NSException
        // (not a Swift Error) on internal-state mismatches — bad audio
        // session, format incompat, dead node, etc. We wrap each in
        // StudioObjC.catchExceptions so the failure becomes a throwable Swift
        // error the plugin can reject with, instead of crashing.
        if !masterConnected {
            NSLog("[Studio] engine.start: attaching master mixer")
            if let err = StudioObjC.catchExceptions({ self.engine.attach(self.masterMixer) }) {
                NSLog("[Studio] engine.start: attach raised \(err.localizedDescription)")
                throw err
            }
            NSLog("[Studio] engine.start: connecting master → mainMixerNode")
            if let err = StudioObjC.catchExceptions({
                self.engine.connect(self.masterMixer, to: self.engine.mainMixerNode, format: nil)
            }) {
                NSLog("[Studio] engine.start: connect raised \(err.localizedDescription)")
                throw err
            }
            masterConnected = true
            NSLog("[Studio] engine.start: master wired")
        }

        if !engine.isRunning {
            NSLog("[Studio] engine.start: starting AVAudioEngine")
            // engine.start() throws Swift Error, not NSException, so a
            // plain try is fine here.
            try engine.start()
            NSLog("[Studio] engine.start: AVAudioEngine running")
        }
        emit()
    }

    public func stopEngine() {
        positionTimer?.invalidate(); positionTimer = nil
        for (_, t) in tracks { t.dispose() }
        tracks.removeAll()
        masterFxChain?.dispose()
        masterFxChain = nil
        if engine.isRunning { engine.stop() }
        try? AVAudioSession.sharedInstance().setActive(false)
    }

    // MARK: - Session binding

    public func loadSession(_ s: Studio.Session, assetLoader: AssetLoader) async throws {
        // start() must have run first. If a caller forgot to wire the
        // audio session, do it now so the rest of this method is safe.
        if !masterConnected { try start() }

        // Tear down previous bindings.
        for (_, t) in tracks { t.dispose() }
        tracks.removeAll()
        masterFxChain?.dispose()
        masterFxChain = nil

        self.session = s

        // Wire master FX chain in front of the engine's main mixer.
        engine.disconnectNodeOutput(masterMixer)
        let chain = FxChain.build(engine: engine, specs: s.master.fx)
        if let chain {
            engine.connect(masterMixer, to: chain.input, format: nil)
            engine.connect(chain.output, to: engine.mainMixerNode, format: nil)
            masterFxChain = chain
        } else {
            engine.connect(masterMixer, to: engine.mainMixerNode, format: nil)
        }
        // Apply master gain.
        masterMixer.outputVolume = Float(dbToGain(s.master.volume_db))

        // Build per-track bindings.
        for tr in s.tracks {
            let binding = try await TrackBinding.build(
                track: tr, engine: engine, master: masterMixer, assetLoader: assetLoader,
                allAssets: s.assets)
            tracks[binding.trackId] = binding
        }

        emit()
    }

    public func updateTrackStrip(id: String, volumeDb: Double?, pan: Double?, mute: Bool?) {
        guard let t = tracks[id] else { return }
        if let v = volumeDb { t.setVolumeDb(v) }
        if let p = pan { t.setPan(Float(p)) }
        if let m = mute { t.setMute(m) }
    }

    public func updateTempo(bpm: Double) {
        // Tempo only affects new scheduling. Existing scheduled events
        // play at the rate they were scheduled at; rebuilding fixes it.
        guard var sess = session else { return }
        sess.tempo_bpm = bpm
        session = sess
        emit()
    }

    // MARK: - Transport

    public func play() {
        NSLog("[Studio] play: enter (engine.isRunning=\(engine.isRunning), tracks=\(tracks.count))")
        if !engine.isRunning {
            // Try to bring the engine up. If this throws, log and bail
            // rather than continuing into scheduling code that requires
            // a running engine.
            do {
                try engine.start()
                NSLog("[Studio] play: engine started from inside play()")
            } catch {
                NSLog("[Studio] play: engine.start failed: \(error.localizedDescription)")
                return
            }
        }
        if isPlayingNow { NSLog("[Studio] play: already playing, no-op"); return }

        // Use `mach_absolute_time()` directly as the host-time anchor
        // when the engine hasn't produced a render yet. Accessing
        // `engine.outputNode.lastRenderTime` before the first render
        // can return nil OR crash on some iOS versions; either way the
        // mach_absolute_time path is safe.
        let nowAbs = mach_absolute_time()
        let startAbs = nowAbs + AVAudioTime.hostTime(forSeconds: 0.1)
        let startTime = AVAudioTime(hostTime: startAbs)
        startHostTime = startTime
        NSLog("[Studio] play: scheduling \(tracks.count) track(s), pausedAt=\(pausedAt)")
        for (_, t) in tracks { t.startScheduling(from: pausedAt, anchor: startTime) }
        NSLog("[Studio] play: schedule done")

        if metronomeOn { scheduleMetronome(from: pausedAt) }
        isPlayingNow = true
        startPositionTimer()
        emit()
    }

    public func pause() {
        guard isPlayingNow else { return }
        // Record where we paused so play() resumes from there.
        pausedAt = currentPositionSeconds()
        for (_, t) in tracks { t.stopScheduling() }
        cancelMetronome()
        isPlayingNow = false
        positionTimer?.invalidate(); positionTimer = nil
        emit()
    }

    public func stopTransport() {
        for (_, t) in tracks { t.stopScheduling() }
        cancelMetronome()
        pausedAt = 0
        isPlayingNow = false
        startHostTime = nil
        positionTimer?.invalidate(); positionTimer = nil
        emit()
    }

    public func seek(toSeconds s: Double) {
        let wasPlaying = isPlayingNow
        if isPlayingNow {
            for (_, t) in tracks { t.stopScheduling() }
            isPlayingNow = false
        }
        pausedAt = max(0, s)
        if wasPlaying { play() } else { emit() }
    }

    public func currentPositionSeconds() -> Double {
        // Use mach_absolute_time() as the wall clock. The previous version
        // depended on `engine.outputNode.lastRenderTime`, which is nil
        // until the engine produces a render — that left the playhead
        // frozen at 0. It also used `&-` on UInt64, which underflows to
        // a massive value when `now < start` (the first 100ms after
        // play(), since startHostTime is scheduled 0.1s in the future).
        guard isPlayingNow, let start = startHostTime else {
            return pausedAt
        }
        let nowAbs = mach_absolute_time()
        if nowAbs <= start.hostTime { return pausedAt }
        let elapsedHost = nowAbs - start.hostTime
        let elapsedSec = AVAudioTime.seconds(forHostTime: elapsedHost)
        return pausedAt + elapsedSec
    }

    public func snapshot() -> StudioEngineState {
        StudioEngineState(
            isReady: engine.isRunning,
            isPlaying: isPlayingNow,
            positionSeconds: currentPositionSeconds(),
            tempoBpm: session?.tempo_bpm ?? 120,
            metronomeOn: metronomeOn
        )
    }

    /// For Recorder to tap onto the master mixer output.
    public var masterMixerNode: AVAudioMixerNode { masterMixer }
    /// For Mixdown to access the engine in manual-rendering mode.
    public var avEngine: AVAudioEngine { engine }

    // MARK: - Private

    private func startPositionTimer() {
        positionTimer?.invalidate()
        // Bind to RunLoop.main explicitly. `Timer.scheduledTimer` adds
        // to the *current* thread's run loop — which on a background
        // queue is nil — and the timer silently never fires. Anchoring
        // to RunLoop.main makes the tick fire regardless of which queue
        // play() was invoked from.
        //
        // Tick at 15 Hz, not 30. Each tick crosses the Capacitor bridge
        // (notifyListeners → JSON serialize → webview message) and at
        // 30 Hz that contention starved the audio buffer thread. 15 Hz
        // is still smoother than the human eye notices on a playhead.
        let timer = Timer(timeInterval: 1.0 / 15.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.emit()
            if let s = self.session, self.currentPositionSeconds() >= s.length_seconds {
                self.stopTransport()
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        positionTimer = timer
    }

    private func emit() {
        onState?(snapshot())
    }

    // MARK: - Metronome

    public func setMetronome(on: Bool) {
        // No early-return guard. The plugin's engine instance is a
        // singleton attached at app launch, so `metronomeOn` persists
        // across editor mounts — meanwhile JS-side React state resets
        // to false on every mount. If a previous session left the flag
        // true, the user's first toggle would short-circuit here and
        // emit no state event, leaving the React button stuck off.
        // Always emit; only skip the heavy work when state truly didn't
        // change.
        let changed = metronomeOn != on
        metronomeOn = on
        NSLog("[Studio] setMetronome on=\(on) isPlaying=\(isPlayingNow) changed=\(changed)")
        if changed {
            if on {
                ensureMetronomeAttached()
                // One immediate click as a confirmation tone. Decouples
                // the audio path from the Timer-driven scheduler — if
                // the user hears this on toggle, any silence during
                // playback is a scheduling bug, not an output-chain bug.
                playClick(accent: true)
                if isPlayingNow { scheduleMetronome(from: currentPositionSeconds()) }
            } else {
                cancelMetronome()
            }
        }
        emit()
    }

    public func setMetronomeVolume(db: Double) {
        // Map dB to a linear gain on the click player's buffer playback.
        // Clamp at -60 dB ≈ silence.
        let gain = db <= -60 ? 0 : pow(10.0, db / 20.0)
        metronomeVolume = Float(min(2.0, max(0, gain)))
        metronomePlayer.volume = metronomeVolume
        emit()
    }

    private func ensureMetronomeAttached() {
        guard !metronomeAttached else { return }
        // Negotiate format against the master mixer's input so the
        // click buffers we generate later use the same channel count +
        // sample rate the engine actually wants.
        let mixerFormat = masterMixer.outputFormat(forBus: 0)
        NSLog("[Studio] metronome attach: mixer fmt sr=\(mixerFormat.sampleRate) ch=\(mixerFormat.channelCount)")
        if let err = StudioObjC.catchExceptions({
            self.engine.attach(self.metronomePlayer)
            self.engine.connect(self.metronomePlayer, to: self.masterMixer, format: mixerFormat)
        }) {
            NSLog("[Studio] metronome attach failed: \(err.localizedDescription)")
            return
        }
        metronomePlayer.volume = metronomeVolume
        // Build the click buffers in the negotiated format so
        // scheduleBuffer doesn't silently drop them. Caller passes Self
        // can't see instance state, so we inline here instead of using
        // a static helper.
        metronomeBeatBuffer = makeClickBuffer(format: mixerFormat, frequency: 1000, durationMs: 30)
        metronomeAccentBuffer = makeClickBuffer(format: mixerFormat, frequency: 1500, durationMs: 30)
        metronomeAttached = true
    }

    private func scheduleMetronome(from currentSeconds: Double) {
        guard let s = session, let anchor = startHostTime else { return }
        ensureMetronomeAttached()
        cancelMetronome()
        // Single self-rescheduling Timer instead of pre-scheduling one
        // per beat for the whole session. The previous version piled up
        // hundreds of pending Timers, all owned by the run loop, all
        // competing for main thread when they fired. That contention
        // starved AVAudioEngine's buffer thread and audio glitched
        // ~30s into playback.
        let secondsPerBeat = 60.0 / max(20.0, s.tempo_bpm)
        let beatsPerBar = max(1, s.time_signature.numerator)
        let firstBeat = Int(ceil(currentSeconds / secondsPerBeat))
        let nowAbs = mach_absolute_time()
        let anchorReal = max(0, AVAudioTime.seconds(forHostTime: anchor.hostTime &- nowAbs))
        let firstDelay = (Double(firstBeat) * secondsPerBeat - currentSeconds) + anchorReal
        scheduleNextClick(after: max(0, firstDelay),
                          beat: firstBeat,
                          beatsPerBar: beatsPerBar,
                          secondsPerBeat: secondsPerBeat,
                          sessionLength: s.length_seconds)
    }

    private func scheduleNextClick(after delay: Double, beat: Int, beatsPerBar: Int,
                                   secondsPerBeat: Double, sessionLength: Double) {
        let accent = (beat % beatsPerBar) == 0
        let timer = Timer(timeInterval: delay, repeats: false) { [weak self] _ in
            guard let self, self.metronomeOn, self.isPlayingNow else { return }
            self.playClick(accent: accent)
            let nextBeat = beat + 1
            let nextAbsSec = Double(nextBeat) * secondsPerBeat
            if nextAbsSec >= sessionLength { return }
            self.scheduleNextClick(after: secondsPerBeat,
                                   beat: nextBeat,
                                   beatsPerBar: beatsPerBar,
                                   secondsPerBeat: secondsPerBeat,
                                   sessionLength: sessionLength)
        }
        RunLoop.main.add(timer, forMode: .common)
        metronomeTimers.append(timer)
    }

    private func cancelMetronome() {
        for t in metronomeTimers { t.invalidate() }
        metronomeTimers.removeAll()
        if metronomePlayer.isPlaying { metronomePlayer.stop() }
    }

    private func playClick(accent: Bool) {
        guard let buf = accent ? metronomeAccentBuffer : metronomeBeatBuffer else {
            NSLog("[Studio] metronome click: no buffer (attached=\(metronomeAttached))")
            return
        }
        // The player can't produce audio if the engine isn't already
        // running — bring it up here as a guard against the user
        // toggling the metronome before pressing play.
        if !engine.isRunning {
            do { try engine.start() }
            catch { NSLog("[Studio] metronome click: engine.start failed: \(error.localizedDescription)"); return }
        }
        NSLog("[Studio] metronome click: accent=\(accent) vol=\(metronomePlayer.volume) engineRunning=\(engine.isRunning) playerAttached=\(metronomeAttached)")
        if let err = StudioObjC.catchExceptions({
            self.metronomePlayer.scheduleBuffer(buf, at: nil, options: [.interrupts], completionHandler: nil)
            if !self.metronomePlayer.isPlaying { self.metronomePlayer.play() }
        }) {
            NSLog("[Studio] metronome click raised \(err.localizedDescription)")
        }
    }

    /// Build a short windowed square-wave click in the given format so
    /// `scheduleBuffer` doesn't silently reject a format mismatch. Writes
    /// the same waveform to all channels of the target format.
    private func makeClickBuffer(format: AVAudioFormat, frequency: Double, durationMs: Double) -> AVAudioPCMBuffer? {
        let sr = format.sampleRate
        let frames = AVAudioFrameCount(sr * durationMs / 1000.0)
        guard frames > 0,
              let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)
        else { return nil }
        buf.frameLength = frames
        let twoPiF = 2.0 * .pi * frequency / sr
        let channels = Int(format.channelCount)
        for ch in 0..<channels {
            guard let chan = buf.floatChannelData?[ch] else { continue }
            for i in 0..<Int(frames) {
                let t = Double(i) / sr
                let env: Double
                if t < 0.004 { env = t / 0.004 }
                else { env = max(0, 1 - (t - 0.004) / (durationMs / 1000.0 - 0.004)) }
                let s = sin(twoPiF * Double(i)) > 0 ? 1.0 : -1.0
                chan[i] = Float(0.4 * env * s)
            }
        }
        return buf
    }
}

func dbToGain(_ db: Double) -> Double {
    return pow(10.0, db / 20.0)
}
