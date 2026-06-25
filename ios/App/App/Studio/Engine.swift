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
    private let engine = AVAudioEngine()
    private let masterMixer: AVAudioMixerNode
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

    public init() {
        self.masterMixer = AVAudioMixerNode()
        engine.attach(masterMixer)
        // Master mixer → engine main → speakers (default routing).
        engine.connect(masterMixer, to: engine.mainMixerNode, format: nil)
    }

    // MARK: - Lifecycle

    public func start() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default,
                                options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
        // 5ms target latency — Core Audio will get as close as the
        // hardware allows. iPad Pro can hit 5ms; iPhone usually 10-15ms.
        try session.setPreferredIOBufferDuration(0.005)
        try session.setActive(true)
        if !engine.isRunning {
            try engine.start()
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
        guard engine.isRunning else { try? engine.start(); return }
        if isPlayingNow { return }
        // Compute the absolute host time at "now + small buffer" so the
        // first scheduled event lands cleanly.
        let renderTime = engine.outputNode.lastRenderTime ?? AVAudioTime(hostTime: mach_absolute_time())
        let nowAbs = renderTime.hostTime
        let startAbs = nowAbs + AVAudioTime.hostTime(forSeconds: 0.05)
        let startTime = AVAudioTime(hostTime: startAbs)
        startHostTime = startTime

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
