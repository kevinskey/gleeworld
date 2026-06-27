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
        NSLog("[Studio] engine.start: configuring audio session")
        // Configure the audio session BEFORE touching AVAudioEngine. iOS
        // is unhappy if you reach into mainMixerNode before there's a
        // valid session — defaultToSpeaker route resolution can crash.
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default,
                                options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
        try session.setActive(true)
        // setPreferredIOBufferDuration must be called AFTER setActive on
        // some iOS versions. Best-effort: ignore failures so a 10ms buffer
        // instead of 5ms doesn't take the whole engine down with it.
        try? session.setPreferredIOBufferDuration(0.005)
        NSLog("[Studio] engine.start: audio session active")

        // First-time wiring: attach the master mixer and route it into
        // the engine's main mixer. Idempotent — only runs once per
        // engine lifetime. THIS is the line that historically crashed
        // when CoreAudio wasn't ready; the lazy-var trick above plus
        // the now-completed audio-session setup keep us safe.
        if !masterConnected {
            NSLog("[Studio] engine.start: attaching master mixer")
            engine.attach(masterMixer)
            NSLog("[Studio] engine.start: connecting master to main")
            engine.connect(masterMixer, to: engine.mainMixerNode, format: nil)
            masterConnected = true
        }

        if !engine.isRunning {
            NSLog("[Studio] engine.start: starting AVAudioEngine")
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
        // If the engine isn't running yet (race or aborted start), bring
        // it up here and CONTINUE into scheduling. The previous version
        // returned after the start() attempt, which meant the user had
        // to press Play twice for any audio to come out.
        if !engine.isRunning {
            do { try engine.start() } catch {
                NSLog("[Studio] engine.start in play() failed: \(error.localizedDescription)")
                return
            }
        }
        if isPlayingNow { return }
        // Compute the absolute host time at "now + small buffer" so the
        // first scheduled event lands cleanly. AVAudioTime.hostTime(forSeconds:)
        // returns a delta in host-time units; we add it to "now" to get
        // the absolute reference for player.play(at:) calls.
        let renderTime = engine.outputNode.lastRenderTime ?? AVAudioTime(hostTime: mach_absolute_time())
        let nowAbs = renderTime.hostTime
        let startAbs = nowAbs + AVAudioTime.hostTime(forSeconds: 0.05)
        let startTime = AVAudioTime(hostTime: startAbs)
        startHostTime = startTime

        NSLog("[Studio] play: scheduling \(tracks.count) track(s), pausedAt=\(pausedAt)")
        for (_, t) in tracks { t.startScheduling(from: pausedAt, anchor: startTime) }

        isPlayingNow = true
        startPositionTimer()
        emit()
    }

    public func pause() {
        guard isPlayingNow else { return }
        // Record where we paused so play() resumes from there.
        pausedAt = currentPositionSeconds()
        for (_, t) in tracks { t.stopScheduling() }
        isPlayingNow = false
        positionTimer?.invalidate(); positionTimer = nil
        emit()
    }

    public func stopTransport() {
        for (_, t) in tracks { t.stopScheduling() }
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
        guard isPlayingNow, let start = startHostTime,
              let now = engine.outputNode.lastRenderTime else {
            return pausedAt
        }
        let elapsedHost = now.hostTime &- start.hostTime
        let elapsedSec = AVAudioTime.seconds(forHostTime: elapsedHost)
        return pausedAt + elapsedSec
    }

    public func snapshot() -> StudioEngineState {
        StudioEngineState(
            isReady: engine.isRunning,
            isPlaying: isPlayingNow,
            positionSeconds: currentPositionSeconds(),
            tempoBpm: session?.tempo_bpm ?? 120
        )
    }

    /// For Recorder to tap onto the master mixer output.
    public var masterMixerNode: AVAudioMixerNode { masterMixer }
    /// For Mixdown to access the engine in manual-rendering mode.
    public var avEngine: AVAudioEngine { engine }

    // MARK: - Private

    private func startPositionTimer() {
        positionTimer?.invalidate()
        positionTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.emit()
            // Auto-stop at end of session length.
            if let s = self.session, self.currentPositionSeconds() >= s.length_seconds {
                self.stopTransport()
            }
        }
    }

    private func emit() {
        onState?(snapshot())
    }
}

func dbToGain(_ db: Double) -> Double {
    return pow(10.0, db / 20.0)
}
