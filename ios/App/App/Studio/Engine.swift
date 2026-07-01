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
        let url = URL(fileURLWithPath: localFilePath)
        let file: AVAudioFile
        do {
            file = try AVAudioFile(forReading: url)
        } catch {
            NSLog("[Studio] addClipToTrack — AVAudioFile open failed for \(localFilePath): \(error.localizedDescription)")
            return
        }
        binding.addClip(clip: clip, file: file,
                        currentSeconds: currentPositionSeconds(),
                        anchor: startHostTime)
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
        if !engine.isRunning {
            do { try engine.start() }
            catch {
                let msg = "engine.start failed: \(error.localizedDescription)"
                NSLog("[Studio] ensureMetronomeAttached — \(msg)")
                self.lastError = msg  // surface to UI toast
                // Fall through and TRY to attach anyway. Some session
                // errors throw here but the graph is still functional.
            }
        }
        // Now masterMixer.outputFormat reflects the real hardware
        // sample rate + channel layout the OS negotiated.
        let mixerFormat = masterMixer.outputFormat(forBus: 0)
        NSLog("[Studio] metronome attach: mixer fmt sr=\(mixerFormat.sampleRate) ch=\(mixerFormat.channelCount)")
        if let err = StudioObjC.catchExceptions({
            self.engine.attach(self.metronomePlayer)
            self.engine.connect(self.metronomePlayer, to: self.masterMixer, format: mixerFormat)
        }) {
            let msg = "metronome attach failed: \(err.localizedDescription) (fmt sr=\(mixerFormat.sampleRate) ch=\(mixerFormat.channelCount))"
            NSLog("[Studio] \(msg)")
            self.lastError = msg
            return
        }
        metronomePlayer.volume = metronomeVolume
        // Build the click buffers in the negotiated format so
        // scheduleBuffer doesn't silently drop them.
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
