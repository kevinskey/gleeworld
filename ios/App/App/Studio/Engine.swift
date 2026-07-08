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
    /// One-shot diagnostic message surfaced to the UI when the engine
    /// encounters a recoverable failure (audio session activation
    /// failure, format mismatch, connect exception, etc). JS-side
    /// StudioEditor toasts this so device users can report failures
    /// without needing Mac + Safari to read NSLog. Cleared to nil on
    /// the next successful op.
    public var lastError: String?
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
    /// Peak limiter as the final stage before the hardware. The mix bus
    /// is float internally, so summing several healthy takes runs the
    /// signal past full scale (measured +6 dBFS with two 0 dBFS tracks)
    /// and hard-clips at the DAC with no meters and no warning on iOS.
    /// Apple's AUPeakLimiter (look-ahead, ~12 ms) transparently holds
    /// program material and mixdown bounces at or under 0 dBFS — the
    /// same protection GarageBand ships on its output bus.
    private lazy var outputLimiter: AVAudioUnitEffect = {
        let desc = AudioComponentDescription(
            componentType: kAudioUnitType_Effect,
            componentSubType: kAudioUnitSubType_PeakLimiter,
            componentManufacturer: kAudioUnitManufacturer_Apple,
            componentFlags: 0, componentFlagsMask: 0)
        return AVAudioUnitEffect(audioComponentDescription: desc)
    }()
    /// FX chain inserted in front of the engine's main output mixer.
    /// The masterMixer feeds the first FX node; the last FX node feeds
    /// the engine's `mainMixerNode`, which is connected to the output.
    private var masterFxChain: FxChain?
    private var tracks: [String: TrackBinding] = [:]

    /// Session currently bound. Read-only after loadSession; structural
    /// edits require a fresh loadSession.
    private(set) var session: Studio.Session?

    /// Latest one-shot error surfaced to the UI. Set by any op that
    /// wants to tell the user something failed (audio session
    /// activation, connect exception, format mismatch). Cleared on
    /// next successful emit. Read by snapshot() → JS via
    /// notifyListeners → StudioEditor toast.
    private var lastError: String?

    /// The audio render clock. AVAudioEngine doesn't expose a transport
    /// of its own, so we keep an explicit `startHostTime` + `pausedAt`
    /// pair and compute the position on demand.
    private var startHostTime: AVAudioTime?
    private var pausedAt: Double = 0
    private var isPlayingNow: Bool = false
    // Audio-session interruption / IO-unit-stop recovery. AVAudioEngine pauses
    // itself when the session is interrupted or the IO unit stops (route change,
    // a graph edit while running, another app grabbing audio) and does NOT
    // auto-resume — without handling it, playback just stops ("moving the gain
    // stops the track", confirmed via device log: "iounit stopped unexpectedly
    // > pausing the engine"). wantsPlayback tracks user intent so we can
    // restart + resume from where we were.
    private var wantsPlayback = false
    private var interruptionResumePos: Double = 0
    private var interruptionWasActive = false
    private var recoveryObserversInstalled = false
    private var recovering = false
    /// True while a take is rolling. play() must not auto-rewind under
    /// a live recording — the take is stamped at the position the user
    /// armed, and yanking the transport to 0 would misplace it.
    public var recordingActive = false

    /// Position-tick callback bridged to JS via the plugin.
    public var onState: ((StudioEngineState) -> Void)?
    /// Discrete named events (see StudioEvents) — the plugin wires this to
    /// Capacitor notifyListeners. Complements the monolithic onState stream.
    public var onEvent: ((String, [String: Any]) -> Void)?
    private func emitEvent(_ name: String, _ payload: [String: Any] = [:]) { onEvent?(name, payload) }
    private var positionTimer: Timer?

    // Metronome — one AVAudioPlayerNode on the master bus; each beat
    // is a `scheduleBuffer(at: nil, options: [.interrupts])` fired from
    // a self-rescheduling Timer at the tempo interval. The sample-
    // accurate variant (build 97) was elegant but silently dropped its
    // first click because AVAudioPlayerNode.play() on a node with no
    // queued buffers doesn't start the render callback pulling.
    // Timer-driven per-beat scheduling routes every click through
    // `playClick`, which is the same code path the toggle-idle
    // confirmation uses — if that plays, this plays.
    private var metronomeOn: Bool = false
    private var metronomeVolume: Float = 0.7
    private lazy var metronomePlayer = AVAudioPlayerNode()
    private var metronomeAttached = false
    // Click buffers built lazily in the outputNode's input format so
    // the buffer's channel count + sample rate matches what the engine
    // expects. A mono 44.1kHz buffer fed into a stereo bus silently
    // drops on AVAudioPlayerNode — no error, just silence.
    private var metronomeBeatBuffer: AVAudioPCMBuffer?
    private var metronomeAccentBuffer: AVAudioPCMBuffer?
    private var metronomeFormat: AVAudioFormat?
    private var metronomeTimers: [Timer] = []
    // True whenever the click player needs a fresh play() call after the
    // next scheduleBuffer. An AVAudioPlayerNode whose queue was emptied
    // while nominally "playing" (initial state, or after reset()) keeps
    // isPlaying == true but renders pure silence for every buffer
    // scheduled `at: nil` — the only repair is play() issued AFTER a
    // buffer is in the queue. isPlaying can't detect this state, so we
    // track it explicitly. Verified via node taps 2026-07-03.
    private var metronomeNeedsRestart = true
    private var metronomeRouteChangeObserver: NSObjectProtocol?

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

        // Activate AVAudioSession with a category that actually drives
        // the speakers. Without this, AVAudioEngine.start() can succeed
        // and engine.isRunning returns true while every scheduled
        // buffer plays into a dormant session — total silence with no
        // error. That was the "metronome won't play in iOS Studio"
        // failure mode.
        //
        // CRITICAL: do NOT pass .mixWithOthers here. WKWebView owns
        // its own audio session (used by HTML <audio>, YouTube embeds,
        // and the Music Tools web-audio metronome). When .playback is
        // set with .mixWithOthers, iOS lets the WebView keep audio
        // focus and our AVAudioEngine outputNode is silently routed
        // to nowhere — every scheduled buffer fires successfully but
        // no sound reaches the speaker. That's what was broken on
        // builds 86–90: Studio metronome + clip playback both silent
        // while Music Tools (WebView) still worked.
        //
        // Without mixWithOthers, .playback takes audio focus. The
        // WebView's existing audio (Music Tools metronome, YouTube
        // playback, etc.) will be paused while Studio is active.
        // That's the correct trade — Studio is a DAW; it should own
        // the speaker while engaged. Recorder path still uses
        // .playAndRecord (with defaultToSpeaker so AirPods mic doesn't
        // route output to earpiece).
        let session = AVAudioSession.sharedInstance()
        let wantsRecord = session.category == .playAndRecord
        do {
            if wantsRecord {
                // Recorder already promoted us — keep that contract so
                // the mic input chain isn't torn down mid-take.
                try session.setActive(true)
            } else {
                try session.setCategory(.playback, mode: .default, options: [])
                // NOTE: .notifyOthersOnDeactivation is a DEACTIVATION-only
                // flag — passing it to setActive(true) throws an
                // OSStatus error that aborts engine.start(), which was
                // silently killing setMetronome / play() on builds 91/92.
                try session.setActive(true)
            }
            NSLog("[Studio] engine.start: AVAudioSession active, category=\(session.category.rawValue), sampleRate=\(session.sampleRate), otherAudio=\(session.isOtherAudioPlaying)")
        } catch {
            NSLog("[Studio] engine.start: AVAudioSession activate failed: \(error.localizedDescription)")
            // Continue — engine.start may still work for non-output use
            // (e.g. offline render). Caller-side toast will catch true
            // silence if it persists.
        }

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
            NSLog("[Studio] engine.start: connecting master → limiter → mainMixerNode")
            if let err = StudioObjC.catchExceptions({
                self.engine.attach(self.outputLimiter)
                self.engine.connect(self.masterMixer, to: self.outputLimiter, format: nil)
                self.engine.connect(self.outputLimiter, to: self.engine.mainMixerNode, format: nil)
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
        installRecoveryObservers()
        emit()
        emitEvent(StudioEvents.ready, ["isReady": engine.isRunning])
    }

    /// Observe audio-session interruptions and AVAudioEngine configuration
    /// changes so a stopped IO unit (which silently pauses the engine) is
    /// recovered instead of leaving the track stopped. Registered once.
    private func installRecoveryObservers() {
        guard !recoveryObserversInstalled else { return }
        recoveryObserversInstalled = true
        let nc = NotificationCenter.default
        nc.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let self else { return }
            let raw = (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt) ?? 0
            if raw == AVAudioSession.InterruptionType.began.rawValue {
                // System paused the engine. Snapshot where we were so we can
                // resume there when the interruption ends.
                if self.isPlayingNow {
                    self.interruptionResumePos = self.currentPositionSeconds()
                    self.interruptionWasActive = true
                    self.isPlayingNow = false
                }
                self.emitEvent(StudioEvents.audioInterrupted, ["reason": "session_interruption"])
                NSLog("[Studio] interruption BEGAN (wantsPlayback=\(self.wantsPlayback), pos=\(self.interruptionResumePos))")
            } else {
                NSLog("[Studio] interruption ENDED — recovering")
                self.recoverPlayback()
            }
        }
        // Fires when the IO unit stops / the render config changes (route
        // change, a graph edit while running). Belt-and-suspenders with the
        // interruption path — some IO-unit stops arrive only as this.
        nc.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main) { [weak self] _ in
            guard let self else { return }
            NSLog("[Studio] engine configuration change — recovering (isRunning=\(self.engine.isRunning))")
            self.recoverPlayback()
        }
    }

    /// Reactivate the session, restart the engine, and resume playback from
    /// where it stopped — the fix for "the track stops" after an interruption
    /// or IO-unit stop. No-op if the user isn't trying to play.
    private func recoverPlayback() {
        guard wantsPlayback, !recovering else { return }
        // If the engine is genuinely still running and we're still playing,
        // there's nothing to recover.
        if engine.isRunning && isPlayingNow { return }
        recovering = true
        let resumePos = interruptionWasActive ? interruptionResumePos : currentPositionSeconds()
        interruptionWasActive = false
        isPlayingNow = false
        do {
            // start() reactivates the AVAudioSession and (re)starts the engine.
            try start()
        } catch {
            NSLog("[Studio] recoverPlayback: start() failed: \(error.localizedDescription)")
        }
        pausedAt = resumePos
        play()   // reschedules every track from pausedAt and flips isPlayingNow
        emitEvent(StudioEvents.engineRecovered, ["positionMs": resumePos * 1000])
        NSLog("[Studio] recoverPlayback: resumed at \(resumePos)")
        recovering = false
    }

    public func stopEngine() {
        // The plugin holds this engine as a singleton, so state set in
        // one Studio visit would otherwise leak into the next (an armed
        // metronome kept clicking on the next session's first Play).
        // Match the web engine, which is rebuilt per editor mount:
        // disarm the click on teardown.
        cancelMetronome()
        metronomeOn = false
        positionTimer?.invalidate(); positionTimer = nil
        for (_, t) in tracks { t.dispose() }
        tracks.removeAll()
        masterFxChain?.dispose()
        masterFxChain = nil
        if engine.isRunning { engine.stop() }
        try? AVAudioSession.sharedInstance().setActive(false)
    }

    // MARK: - Session binding

    // Serializes graph rebuilds. loadSession suspends at `await` points (asset
    // loading) mid-rebuild, and the plugin fires each call as its own Task —
    // so toggling an effect (which re-pushes the session) could start a second
    // loadSession that interleaves disconnect/connect on the shared, NON
    // thread-safe AVAudioEngine graph, corrupting the heap (observed crash:
    // AVAudioEngine.connect → libmalloc "memory corruption of free block",
    // build 135). Chain each rebuild after any in-flight one so they run one at
    // a time. The lock guards only the tiny task-chain bookkeeping (no await is
    // held under it, so it can't deadlock).
    private var previousLoad: Task<Void, Never>?
    private let loadLock = NSLock()

    public func loadSession(_ s: Studio.Session, assetLoader: AssetLoader) async throws {
        loadLock.lock()
        let prior = previousLoad
        let body = Task<Void, Error> {
            await prior?.value  // wait our turn behind any in-flight rebuild
            try await self.loadSessionBody(s, assetLoader: assetLoader)
        }
        // The next caller waits on this (errors swallowed — it's only a gate).
        previousLoad = Task { _ = try? await body.value }
        loadLock.unlock()
        try await body.value  // propagate this rebuild's result/errors to us
    }

    private func loadSessionBody(_ s: Studio.Session, assetLoader: AssetLoader) async throws {
        NSLog("[Studio.load] ENTER tracks=\(s.tracks.count) assets=\(s.assets.count)")
        // start() must have run first. If a caller forgot to wire the
        // audio session, do it now so the rest of this method is safe.
        if !masterConnected { try start() }
        NSLog("[Studio.load] started/masterConnected ok")

        // STOP the engine for the whole rebuild. Bulk graph surgery on
        // a running AVAudioEngine is unreliable: connecting chains of
        // virgin mixers live makes the engine silently drop neighboring
        // connections (see the wiring note in TrackBinding.build). With
        // the engine stopped, the graph negotiates once, atomically, at
        // the restart below.
        let wasRunning = engine.isRunning
        if wasRunning { engine.stop() }
        NSLog("[Studio.load] engine stopped (wasRunning=\(wasRunning)); disposing \(tracks.count) old bindings")

        // Tear down previous bindings.
        for (_, t) in tracks { t.dispose() }
        tracks.removeAll()
        masterFxChain?.dispose()
        masterFxChain = nil
        NSLog("[Studio.load] old bindings disposed")

        self.session = s

        // Build per-track bindings FIRST, master wiring after. Track
        // building connects inputs into masterMixer, and (before the
        // explicit-format fix in TrackBinding.build) those connects
        // re-negotiated masterMixer's format and silently dropped its
        // output link — wiring the master last means nothing runs after
        // it that could tear it down again.
        for (i, tr) in s.tracks.enumerated() {
            NSLog("[Studio.load] build track \(i+1)/\(s.tracks.count) …")
            let binding = try await TrackBinding.build(
                track: tr, engine: engine, master: masterMixer, assetLoader: assetLoader,
                allAssets: s.assets)
            switch tr {
            case .audio(let t): binding.userMute = t.mute; binding.userSolo = t.solo
            case .midi(let t):  binding.userMute = t.mute; binding.userSolo = t.solo
            }
            tracks[binding.trackId] = binding
            NSLog("[Studio.load] built track \(i+1) ok")
        }
        recomputeSolo()
        NSLog("[Studio.load] all tracks built; wiring master fx")

        // Wire master FX chain in front of the engine's main mixer.
        // format: nil here (unlike the track wiring above) — masterMixer's
        // format is already stabilized by the explicit-format track
        // connects, and an explicit format on this reconnect raised an
        // NSException out of AVAudioEngineGraph::_Connect on a running
        // graph. Wrapped so a connect failure degrades to the play()-time
        // self-heal instead of crashing loadSession.
        engine.disconnectNodeOutput(masterMixer)
        let chain = FxChain.build(engine: engine, specs: s.master.fx)
        if let err = StudioObjC.catchExceptions({
            // The output limiter stays the last node before mainMixer in
            // both branches: master → [fx chain] → limiter → mainMixer.
            self.engine.disconnectNodeInput(self.outputLimiter)
            self.engine.disconnectNodeOutput(self.outputLimiter)
            if let chain {
                self.engine.connect(self.masterMixer, to: chain.input, format: nil)
                self.engine.connect(chain.output, to: self.outputLimiter, format: nil)
                self.masterFxChain = chain
            } else {
                self.engine.connect(self.masterMixer, to: self.outputLimiter, format: nil)
            }
            self.engine.connect(self.outputLimiter, to: self.engine.mainMixerNode, format: nil)
        }) {
            NSLog("[Studio] loadSession master rewire raised \(err.localizedDescription)")
        }
        // Apply master gain.
        masterMixer.outputVolume = Float(dbToGain(s.master.volume_db))
        NSLog("[Studio.load] master wired; restarting engine (wasRunning=\(wasRunning))")

        // Restart — the rebuilt graph negotiates formats here, in one
        // shot, with every connection in place.
        if wasRunning && !engine.isRunning {
            do { try engine.start() }
            catch {
                NSLog("[Studio] loadSession: engine restart failed: \(error.localizedDescription)")
                lastError = "engine restart failed: \(error.localizedDescription)"
            }
        }
        NSLog("[Studio.load] DONE (engine.isRunning=\(engine.isRunning))")

        emit()
    }

    /// Self-heal: if anything re-negotiated masterMixer's format and
    /// dropped its output link (route change, incremental connect on a
    /// running graph), every bus goes silent with no error. Cheap to
    /// check on each play().
    private func ensureMasterWired() {
        let masterPts = engine.outputConnectionPoints(for: masterMixer, outputBus: 0)
        let limiterPts = engine.outputConnectionPoints(for: outputLimiter, outputBus: 0)
        guard masterPts.isEmpty || limiterPts.isEmpty else { return }
        NSLog("[Studio] master output chain was disconnected — rewiring")
        if let err = StudioObjC.catchExceptions({
            if masterPts.isEmpty {
                if let chain = self.masterFxChain {
                    self.engine.connect(self.masterMixer, to: chain.input, format: nil)
                } else {
                    self.engine.connect(self.masterMixer, to: self.outputLimiter, format: nil)
                }
            }
            if limiterPts.isEmpty {
                self.engine.connect(self.outputLimiter, to: self.engine.mainMixerNode, format: nil)
            }
        }) {
            NSLog("[Studio] master rewire raised \(err.localizedDescription)")
        }
    }

    public func updateTrackStrip(id: String, volumeDb: Double?, pan: Double?, mute: Bool?, solo: Bool? = nil) {
        guard let t = tracks[id] else { return }
        if let v = volumeDb { t.setVolumeDb(v) }
        if let p = pan { t.setPan(Float(p)) }
        if let m = mute { t.userMute = m }
        if let s = solo { t.userSolo = s }
        recomputeSolo()
    }

    /// Live FX-parameter update — apply changed params to an already-built FX
    /// node without rebuilding the graph, so tweaking a reverb/EQ/gain knob
    /// doesn't stop playback or re-decode assets. `trackId == nil` targets the
    /// master bus. Structural FX changes (add/remove/reorder/enable) still go
    /// through loadSession. Wrapped: an AU param set shouldn't raise, but the
    /// graph guard keeps a bad cast/state from ever aborting.
    public func setFxParam(trackId: String?, spec: Studio.FxNode) {
        _ = StudioObjC.catchExceptions {
            if let tid = trackId {
                _ = self.tracks[tid]?.applyFxParam(fxId: spec.id, spec: spec)
            } else {
                _ = self.masterFxChain?.setParams(fxId: spec.id, spec: spec)
            }
        }
    }

    /// Solo override — when any track is soloed, every non-soloed track
    /// is silenced regardless of its own mute flag. Mirrors the web
    /// engine's recomputeSolo; before this, the S button did nothing on
    /// iOS (updateStrip dropped the flag entirely).
    private func recomputeSolo() {
        var anySolo = false
        for (_, t) in tracks where t.userSolo { anySolo = true; break }
        for (_, t) in tracks {
            t.setMute(anySolo ? !t.userSolo : t.userMute)
        }
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
        ensureMasterWired()
        for (_, t) in tracks { t.verifyWiring() }

        // Auto-rewind: if the head is parked at/after the end of the
        // last clip (typical after a take plays out), snap to 0 so Play
        // makes sound instead of running silently past the material.
        // Mirrors the web engine's guard; without it, "play after the
        // song ended" reads as the app going dead.
        var latestClipEnd: Double = 0
        for (_, t) in tracks { latestClipEnd = max(latestClipEnd, t.latestClipEnd()) }
        if !recordingActive && latestClipEnd > 0 && pausedAt >= latestClipEnd {
            NSLog("[Studio] play: head at \(pausedAt) past last clip end \(latestClipEnd) — auto-rewind to 0")
            pausedAt = 0
        }

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
        wantsPlayback = true   // user intent — drives interruption recovery
        startPositionTimer()
        emit()
        emitEvent(StudioEvents.playbackStarted, ["positionMs": pausedAt * 1000])
    }

    public func pause() {
        cancelCountIn()
        wantsPlayback = false   // deliberate stop — don't auto-resume
        guard isPlayingNow else { return }
        // Record where we paused so play() resumes from there.
        pausedAt = currentPositionSeconds()
        for (_, t) in tracks { t.stopScheduling() }
        cancelMetronome()
        isPlayingNow = false
        positionTimer?.invalidate(); positionTimer = nil
        emit()
        emitEvent(StudioEvents.playbackPaused, ["positionMs": pausedAt * 1000])
    }

    public func stopTransport() {
        cancelCountIn()
        wantsPlayback = false   // deliberate stop — don't auto-resume
        for (_, t) in tracks { t.stopScheduling() }
        cancelMetronome()
        pausedAt = 0
        isPlayingNow = false
        startHostTime = nil
        positionTimer?.invalidate(); positionTimer = nil
        emit()
        emitEvent(StudioEvents.playbackStopped)
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

    // MARK: - Incremental clip add / remove

    /// Splice a single audio clip into a live track without rebuilding
    /// the engine. Caller resolves the asset to a local file path
    /// (download / cache lookup) and hands it in. We open the
    /// AVAudioFile, then ask the TrackBinding to attach a player.
    /// If the transport is currently playing, the new clip is scheduled
    /// against the live anchor so it joins playback in place.
    public func addClipToTrack(trackId: String, clip: Studio.AudioClip, localFilePath: String) {
        guard let binding = tracks[trackId] else {
            NSLog("[Studio] addClipToTrack — unknown trackId \(trackId)")
            return
        }

        // Pull-path branch (opt-in via setPullRendererEnabled). Decode +
        // convert OFF the audio thread; once the buffer is ready, hand
        // it to the track's PullRenderer.
        if pullRendererEnabled {
            // Ensure the pull renderer is attached to this track before
            // we enqueue the convert. We pass `self` so the renderer's
            // render block can pull the live transport position each
            // cycle.
            if !binding.isPullPathEnabled {
                let format = masterMixer.outputFormat(forBus: 0)
                binding.enablePullRenderer(format: format) { [weak self] in
                    self?.currentPositionSeconds() ?? 0
                }
            }
            let url = URL(fileURLWithPath: localFilePath)
            // Route through StudioAudioBufferCache.shared — the same
            // asset_id reused across multiple clips (loop a chop 16x)
            // hits the cache instead of decoding 16 times. LRU cap is
            // 200 MB; eviction never deallocates a buffer that's
            // currently held by a PullRenderer (ARC keeps it alive).
            Task {
                do {
                    let file = try AVAudioFile(forReading: url)
                    let format = self.masterMixer.outputFormat(forBus: 0)
                    let buf = try await StudioAudioBufferCache.shared.loadOrDecode(
                        assetId: clip.asset_id, file: file, targetFormat: format)
                    await MainActor.run {
                        binding.addClipPullPath(clip: clip, buffer: buf)
                    }
                } catch {
                    NSLog("[Studio] pull-path decode failed for \(clip.id): \(error.localizedDescription)")
                }
            }
            return
        }

        // Push-path (default, battle-tested AVAudioPlayerNode).
        //
        // Accept remote URLs too: after the background upload swaps a
        // provisional take for the stored asset, the JS diff hands us
        // the signed https URL. AVAudioFile can only read local files
        // (despite an old comment upstream claiming otherwise), so
        // download to tmp first — same approach as AssetLoader. Local
        // paths keep the fast synchronous route.
        if localFilePath.hasPrefix("http://") || localFilePath.hasPrefix("https://") {
            guard let remote = URL(string: localFilePath) else {
                self.clipLoadFailed(clip.id, "bad remote URL")
                return
            }
            Task {
                do {
                    let (data, _) = try await URLSession.shared.data(from: remote)
                    let tmp = FileManager.default.temporaryDirectory
                        .appendingPathComponent("clip-\(clip.asset_id).wav")
                    try data.write(to: tmp, options: .atomic)
                    let file = try AVAudioFile(forReading: tmp)
                    await MainActor.run {
                        binding.addClip(clip: clip, file: file,
                                        currentSeconds: self.currentPositionSeconds(),
                                        anchor: self.startHostTime)
                    }
                } catch {
                    await MainActor.run {
                        self.clipLoadFailed(clip.id, error.localizedDescription)
                    }
                }
            }
            return
        }

        let url = URL(fileURLWithPath: localFilePath)
        let file: AVAudioFile
        do {
            file = try AVAudioFile(forReading: url)
        } catch {
            clipLoadFailed(clip.id, "AVAudioFile open failed for \(localFilePath): \(error.localizedDescription)")
            return
        }
        binding.addClip(clip: clip, file: file,
                        currentSeconds: currentPositionSeconds(),
                        anchor: startHostTime)
    }

    /// Surface a clip-load failure to the UI (toast via lastError) —
    /// a take that silently never joins the graph reads as "recording
    /// is broken" with zero signal for anyone to act on.
    private func clipLoadFailed(_ clipId: String, _ detail: String) {
        let msg = "clip \(clipId) failed to load: \(detail)"
        NSLog("[Studio] addClipToTrack — \(msg)")
        lastError = msg
        emit()
    }

    public func removeClipFromTrack(trackId: String, clipId: String) {
        guard let binding = tracks[trackId] else { return }
        if binding.isPullPathEnabled {
            binding.removeClipPullPath(clipId: clipId)
        } else {
            binding.removeClip(clipId: clipId)
        }
    }

    public func hasTrack(trackId: String) -> Bool {
        return tracks[trackId] != nil
    }

    /// Total hardware round-trip latency in milliseconds (input + output
    /// + buffer duration). Used by the recording / mixdown layer to
    /// align captured audio with scheduled clicks.
    public func getHardwareLatencyMs() -> Double {
        let session = AVAudioSession.sharedInstance()
        return (session.inputLatency + session.outputLatency + session.ioBufferDuration) * 1000.0
    }

    // MARK: - Pull-based rendering (opt-in)
    //
    // Experimental path: decode each asset to a master-format PCM
    // buffer on a background queue, then feed it to an
    // AVAudioSourceNode whose render block does in-place mixing. The
    // existing AVAudioPlayerNode path remains the default. Flip per
    // tenant via setPullRendererEnabled(true) once we've validated
    // the render block on real hardware. See PullRenderer.swift +
    // AudioConverter.swift.

    private var pullRendererEnabled: Bool = false

    public func setPullRendererEnabled(_ on: Bool) {
        pullRendererEnabled = on
        NSLog("[Studio] pull renderer \(on ? "ENABLED" : "disabled")")
    }

    public func isPullRendererEnabled() -> Bool { pullRendererEnabled }

    /// Decode + convert an asset file into a buffer matching the
    /// master mixer's output format. Background-queue work. Returns
    /// the converted buffer ready to hand to a PullRenderer clip.
    /// Errors propagate; engine state is untouched.
    public func prepareAssetForPullRender(localFilePath: String) async throws -> AVAudioPCMBuffer {
        let url = URL(fileURLWithPath: localFilePath)
        let file = try AVAudioFile(forReading: url)
        let target = masterMixer.outputFormat(forBus: 0)
        return try await StudioAudioConverter.decodeAndConvertAsync(file: file, targetFormat: target)
    }

    /// Eagerly decode every supplied asset into Float32 PCM and seed
    /// the LRU cache. Logic Pro / Pro Tools do this on session open
    /// so the first Play has zero disk I/O on the audio thread. We
    /// fan the decodes out in parallel on .userInitiated background
    /// tasks; errors per-asset are logged + swallowed so one bad file
    /// doesn't block the rest of the warm-up.
    ///
    /// Pass `[(assetId, localFilePath)]`. The cache key for each is
    /// `(assetId, masterFormat)` so future addClipToTrack on the
    /// pull path resolves instantly.
    public func prewarmAssets(_ entries: [(assetId: String, localFilePath: String)]) {
        let target = masterMixer.outputFormat(forBus: 0)
        // Concurrency cap so we don't open 100 file descriptors at
        // once on a session with a giant asset list. 4 parallel decodes
        // saturates a modern A-series CPU's vDSP throughput without
        // contending for the audio thread.
        let maxParallel = 4
        let semaphore = DispatchSemaphore(value: maxParallel)
        for entry in entries {
            DispatchQueue.global(qos: .userInitiated).async {
                semaphore.wait()
                defer { semaphore.signal() }
                if StudioAudioBufferCache.shared.get(assetId: entry.assetId, format: target) != nil {
                    return  // already cached — skip the decode
                }
                do {
                    let url = URL(fileURLWithPath: entry.localFilePath)
                    let file = try AVAudioFile(forReading: url)
                    let buf = try StudioAudioConverter.decodeAndConvert(file: file, targetFormat: target)
                    StudioAudioBufferCache.shared.put(assetId: entry.assetId, format: target, buffer: buf)
                } catch {
                    NSLog("[Studio] prewarm failed for \(entry.assetId): \(error.localizedDescription)")
                }
            }
        }
        NSLog("[Studio] prewarmAssets dispatched \(entries.count) decode task(s) (max \(maxParallel) in flight)")
    }

    public func snapshot() -> StudioEngineState {
        StudioEngineState(
            isReady: engine.isRunning,
            isPlaying: isPlayingNow,
            positionSeconds: currentPositionSeconds(),
            tempoBpm: session?.tempo_bpm ?? 120,
            metronomeOn: metronomeOn,
            lastError: lastError
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
        // One-shot: any error surfaces on the emit that saw it, then
        // clears so it doesn't re-fire on every 15Hz position tick and
        // spam the user with duplicate toasts. If the same fault
        // reoccurs on a later op, the new lastError will fire a fresh
        // toast — which is what we want.
        lastError = nil
    }

    /// Pending count-in timers (clicks + the grid-start handoff), so a
    /// Stop during the pre-roll cancels cleanly.
    private var countInTimers: [Timer] = []
    /// Invoked when a pending count-in is cancelled (Stop/Pause during
    /// the pre-roll) so the plugin can reject its still-pending call
    /// instead of leaving the JS await hanging forever.
    private var countInCancelHandler: (() -> Void)?

    /// Native-owned count-in: click `beats` pre-roll beats on Timers and
    /// then, in the FINAL timer callback on the same clock, run
    /// `onGridStart` (recorder trigger) and start the transport. The JS
    /// flow previously drove the count-in and then crossed the bridge
    /// twice (recordStart, play) before the grid began — 100-300 ms of
    /// serial latency that made beat 1 land audibly late off the
    /// count-in pulse. Here the handoff is one timer tick.
    public func playWithCountIn(beats: Int, secondsPerBeat: Double,
                                beatsPerBar: Int,
                                onCancelled: (() -> Void)? = nil,
                                onGridStart: (() -> Void)?) {
        cancelCountIn()
        countInCancelHandler = onCancelled
        guard beats > 0 else {
            onGridStart?()
            play()
            return
        }
        ensureMetronomeAttached()
        for i in 0..<beats {
            let accent = (i % max(1, beatsPerBar)) == 0
            let t = Timer(timeInterval: Double(i) * secondsPerBeat, repeats: false) { [weak self] _ in
                self?.playClick(accent: accent)
            }
            RunLoop.main.add(t, forMode: .common)
            countInTimers.append(t)
        }
        let start = Timer(timeInterval: Double(beats) * secondsPerBeat, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.countInCancelHandler = nil
            onGridStart?()
            self.play()
        }
        RunLoop.main.add(start, forMode: .common)
        countInTimers.append(start)
    }

    public func cancelCountIn() {
        for t in countInTimers { t.invalidate() }
        countInTimers.removeAll()
        let handler = countInCancelHandler
        countInCancelHandler = nil
        handler?()
    }

    // MARK: - Metronome

    public func setMetronome(on: Bool) {
        // Toggle-only: flip the flag, tell the UI, done. NO AVAudio
        // side effects on this path. Every attempt to fire an audible
        // confirmation click here (both the sample-accurate refactor
        // AND the Timer-based revert) either crashed the engine or
        // silently poisoned graph state such that the *state event*
        // itself never landed and the React button stayed grey. The
        // audio graph is now only touched from `scheduleMetronome`
        // (called from `play()` when the transport actually starts),
        // and from `cancelMetronome` on transport stop / toggle-off.
        //
        // Consequence: no click sounds until the user hits Play. This
        // matches Logic and Pro Tools — an armed click without a
        // running transport doesn't tick, and the toolbar just shows
        // which state the click is armed to.
        let changed = metronomeOn != on
        metronomeOn = on
        NSLog("[Studio] setMetronome on=\(on) isPlaying=\(isPlayingNow) changed=\(changed)")
        if changed {
            if on && isPlayingNow {
                // Transport already running — start scheduling clicks
                // from the current position.
                scheduleMetronome(from: currentPositionSeconds())
            } else if !on {
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
        // engine.start FIRST — outputNode's negotiated format isn't
        // valid until the graph is running. Reading a stale format
        // and connecting with it is how earlier builds silently
        // produced no sound.
        if !engine.isRunning {
            do { try engine.start() }
            catch {
                let msg = "engine.start failed: \(error.localizedDescription)"
                NSLog("[Studio] ensureMetronomeAttached — \(msg)")
                self.lastError = msg
            }
        }

        // Use the outputNode's inputFormat — this is what the engine
        // is actually delivering to the speakers after route
        // negotiation (headphones, Bluetooth, AirPods). masterMixer's
        // outputFormat sometimes lags behind on route changes.
        let format = engine.outputNode.inputFormat(forBus: 0)

        if metronomeAttached {
            // Already up. Rebuild buffers only if the format changed
            // under us (e.g. AirPods just connected and the sample
            // rate flipped from 48k to 24k).
            if let cached = metronomeFormat,
               cached.sampleRate == format.sampleRate,
               cached.channelCount == format.channelCount {
                return
            }
            NSLog("[Studio] metronome: format changed sr=\(format.sampleRate) ch=\(format.channelCount) — rebuilding buffers")
            metronomeBeatBuffer = makeClickBuffer(format: format, frequency: 1000, durationMs: 30)
            metronomeAccentBuffer = makeClickBuffer(format: format, frequency: 1500, durationMs: 30)
            metronomeFormat = format
            return
        }

        NSLog("[Studio] metronome attach: fmt sr=\(format.sampleRate) ch=\(format.channelCount)")
        if let err = StudioObjC.catchExceptions({
            self.engine.attach(self.metronomePlayer)
            self.engine.connect(self.metronomePlayer, to: self.masterMixer, format: format)
        }) {
            let msg = "metronome attach failed: \(err.localizedDescription) (fmt sr=\(format.sampleRate) ch=\(format.channelCount))"
            NSLog("[Studio] \(msg)")
            self.lastError = msg
            return
        }
        metronomePlayer.volume = metronomeVolume
        metronomeBeatBuffer = makeClickBuffer(format: format, frequency: 1000, durationMs: 30)
        metronomeAccentBuffer = makeClickBuffer(format: format, frequency: 1500, durationMs: 30)
        metronomeFormat = format

        // Do NOT call play() here. Starting an AVAudioPlayerNode with an
        // EMPTY queue corrupts its render anchor: isPlaying flips true,
        // but every buffer scheduled afterwards with `at: nil` renders
        // pure silence (verified via node tap — playerPeak stayed 0.0
        // while scheduleBuffer succeeded). Because isPlaying is already
        // true, playClick's schedule-then-play ordering never gets to
        // issue the corrective play(). The first real click owns the
        // schedule→play sequence instead (see playClick).
        metronomeAttached = true

        // Rebuild attach+buffers if the audio route changes mid-flight.
        if metronomeRouteChangeObserver == nil {
            metronomeRouteChangeObserver = NotificationCenter.default.addObserver(
                forName: AVAudioSession.routeChangeNotification, object: nil, queue: nil
            ) { [weak self] _ in
                guard let self else { return }
                NSLog("[Studio] metronome: route change — rechecking format")
                self.ensureMetronomeAttached()
                if self.isPlayingNow && self.metronomeOn {
                    self.scheduleMetronome(from: self.currentPositionSeconds())
                }
            }
        }
    }

    private func scheduleMetronome(from currentSeconds: Double) {
        guard let s = session else { return }
        ensureMetronomeAttached()
        cancelMetronome()

        let secondsPerBeat = 60.0 / max(20.0, s.tempo_bpm)
        let beatsPerBar = max(1, s.time_signature.numerator)
        let firstBeat = Int(ceil(currentSeconds / secondsPerBeat))
        let firstDelay = Double(firstBeat) * secondsPerBeat - currentSeconds
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
        // stop(), not reset(). reset() empties the queue but leaves
        // isPlaying == true — the exact silent-render state described on
        // metronomeNeedsRestart's declaration, and a play() re-issued in
        // that state is a no-op (verified via node taps 2026-07-03:
        // pause→resume stayed at playerPeak=0.0 with the reset()+play()
        // combination). stop() drops isPlaying so the next click's
        // schedule→play sequence re-anchors the node for real. The old
        // build-100 crash was a stop()/play() pair issued back-to-back;
        // here the next play() only happens on a later beat timer with a
        // buffer already queued, and both calls stay exception-wrapped.
        if let err = StudioObjC.catchExceptions({
            if self.metronomePlayer.isPlaying {
                self.metronomePlayer.stop()
            }
        }) {
            NSLog("[Studio] metronome stop raised \(err.localizedDescription)")
        }
        metronomeNeedsRestart = true
    }

    /// Public single-click entry point — used by the JS count-in
    /// pre-roll (StudioEditor drives the count-in cadence from its own
    /// timer BEFORE play() starts the transport). Safe while the
    /// transport is idle: attaches/builds buffers on first use.
    public func clickOnce(accent: Bool) {
        ensureMetronomeAttached()
        playClick(accent: accent)
    }

    /// Fire one immediate click. Used ONLY for the toggle-on
    /// confirmation when the transport is idle. During playback the
    /// scheduler owns click timing and this must not run — an untimed
    /// click can race the first scheduled beat.
    private func playClick(accent: Bool) {
        guard let buf = accent ? metronomeAccentBuffer : metronomeBeatBuffer else {
            NSLog("[Studio] metronome click: no buffer (attached=\(metronomeAttached))")
            self.lastError = "metronome click: no buffer (attached=\(metronomeAttached))"
            return
        }
        if !engine.isRunning {
            do { try engine.start() }
            catch {
                let msg = "metronome click: engine.start failed: \(error.localizedDescription)"
                NSLog("[Studio] \(msg)")
                self.lastError = msg
                return
            }
        }
        // Wrap both schedule + play in catchExceptions — AVAudioEngine
        // graph mutations on a Timer callback (RunLoop.main) throw raw
        // NSExceptions on state mismatches, which crash the app if
        // uncaught. Every AVAudioPlayerNode call site inside the
        // metronome path has to be exception-safe.
        //
        // Order matters: schedule the buffer BEFORE play(). Calling
        // play() on a node with no queued buffers doesn't start the
        // render callback pulling until something is scheduled — flip
        // that order (as the sample-accurate refactor did briefly) and
        // the first click never sounds. `.interrupts` also kicks the
        // node's internal state so the buffer plays on the next
        // callback rather than getting stuck behind the (empty) queue.
        if let err = StudioObjC.catchExceptions({
            self.metronomePlayer.scheduleBuffer(buf, at: nil, options: [.interrupts], completionHandler: nil)
            if self.metronomeNeedsRestart || !self.metronomePlayer.isPlaying {
                self.metronomePlayer.play()
                self.metronomeNeedsRestart = false
            }
        }) {
            let msg = "metronome click raised \(err.localizedDescription)"
            NSLog("[Studio] \(msg)")
            self.lastError = msg
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
