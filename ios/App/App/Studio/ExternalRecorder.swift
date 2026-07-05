// External-source coexistence recorder — Part Tracks × Studio shared engine.
//
// This is the iOS capture path for recording vocals OVER an external
// backing source (Apple Music via MPMusicPlayerController, a YouTube
// iframe in the WebView, or an uploaded file played by the WebView).
// The backing source keeps playing; we only capture the mic.
//
// CRITICAL DESIGN: this class owns a DEDICATED AVAudioEngine instance.
// It never touches StudioNativeEngine's engine graph, transport, or
// audio session lifecycle. Studio's exclusive `.playback` focus design
// (see Engine.swift start()) and its prepareRecordSession/recordWithCountIn
// paths must stay bit-identical — so coexistence recording gets its own
// engine and its own session handling entirely.
//
// Capture is an inputNode tap → 16-bit WAV AVAudioFile in tmp. Count-in
// clicks reuse Studio's click waveform (same makeClickBuffer algorithm as
// Engine.swift) on the native clock. Live peaks stream out at ~30Hz for
// the JS waveform, mirroring StudioNativeRecorder's peak-timer pattern.
//
// Start semantics: the start callback resolves from the FIRST TAP BUFFER,
// not at tap-install time. Installing a tap can "succeed" against a dead
// input (e.g. the session has no record route because MusicKit owns it and
// it was never record-capable) — the tap simply never fires. A 1.5s
// watchdog converts that silence into a clean error instead of a hung
// Capacitor call that reads as a successful-but-empty take.
//
// The AVAudioSession is configured by the plugin BEFORE start() runs
// (prepareExternalRecordSession) — or deliberately left untouched when
// MusicKit owns it. start() only starts the dedicated engine + tap.

import Foundation
import AVFoundation

public final class ExternalRecorder {
    /// Dedicated capture engine — intentionally separate from Studio's.
    private let captureEngine = AVAudioEngine()
    /// Count-in click player on the dedicated engine's main mixer.
    private let clickPlayer = AVAudioPlayerNode()
    private var clickBeatBuffer: AVAudioPCMBuffer?
    private var clickAccentBuffer: AVAudioPCMBuffer?
    private var clickAttached = false
    private var clickNeedsRestart = true

    /// Main-thread handle to the capture file, used ONLY for length /
    /// format reads in stop(). The tap closure holds its OWN strong
    /// reference (captured at install time) so the audio thread never
    /// reads this property — no cross-thread file-handle race.
    private var file: AVAudioFile?
    private(set) public var outputUrl: URL?
    private(set) public var isCapturing = false
    /// True from start() entry until the first tap buffer resolves the
    /// start callback (or a failure path clears it). Guards against a
    /// mid-count-in double-start leaking a second engine/tap under the
    /// live take.
    private(set) public var isArming = false
    private var tapInstalled = false
    /// When the tap went in — used to distinguish "stopped instantly"
    /// from "ran a while but captured zero frames" (dead input).
    private var tapInstalledAt: Date?

    /// Pre-roll timers (count-in clicks + the capture-start handoff).
    private var countInTimers: [Timer] = []
    /// Fires if the input tap never delivers a buffer after install.
    private var watchdogTimer: Timer?

    /// Latest mic peak (dBFS, negative) written by the audio-thread tap,
    /// read by the main-thread peak timer. Guarded by an unfair lock —
    /// a Float torn-read here would only flicker a meter, but the lock
    /// keeps it honest without measurable cost.
    private var latestPeakDb: Float = -160
    private var peakLock = os_unfair_lock_s()
    private var peakTimer: Timer?

    /// One-shot start callbacks, drained by exactly one of: the first tap
    /// buffer (success), the watchdog (dead input), or stop()/teardown()
    /// (caller bailed early). Guarded by startLock — the audio thread and
    /// main thread race for it.
    private var pendingStart: (started: (Double) -> Void, failed: (String) -> Void)?
    private var startLock = os_unfair_lock_s()

    /// Fires ~30Hz on the main run loop with the latest peak power so the
    /// JS waveform can draw the live envelope. Wired by the plugin to a
    /// dedicated 'externalRecordPeak' event (kept separate from Studio's
    /// 'recordPeak' so Part Tracks JS subscribes without colliding).
    public var onPeak: ((Float) -> Void)?

    public init() {}

    deinit {
        // Last-resort cleanup if the plugin drops its reference while a
        // tap/engine is live (abandoned prepare, plugin teardown).
        teardown()
    }

    // MARK: - Capture lifecycle

    /// Run the count-in (if any) on the native clock, then start the tap
    /// capturing to a WAV file. Calls `onStarted(epochMs)` once the FIRST
    /// input buffer has arrived (capture demonstrably rolling), or
    /// `onError` on any failure (fully torn down first).
    ///
    /// MUST be called on the main thread (schedules Timers on RunLoop.main
    /// and mutates the engine graph).
    public func start(countInBeats: Int,
                      secondsPerBeat: Double,
                      clickVolume: Float,
                      onStarted: @escaping (_ epochMs: Double) -> Void,
                      onError: @escaping (_ message: String) -> Void) {
        guard !isCapturing && !isArming else {
            onError("external record already in progress")
            return
        }
        isArming = true

        // Arm the one-shot start callbacks IMMEDIATELY — before the
        // count-in timers are scheduled. If a stop()/teardown() (user
        // cancel, or a re-prepare) lands DURING the count-in, stop()
        // must find these handlers and settle the caller's promise;
        // arming only in beginCapture (post-count-in) left pendingStart
        // nil through the whole pre-roll, so the timers holding onError
        // were invalidated and the Capacitor call never settled.
        // beginCapture re-arms the same pair harmlessly. Every early
        // error path below settles exactly once: teardown() drains
        // pendingStart SILENTLY, then the path invokes its onError
        // parameter directly.
        os_unfair_lock_lock(&startLock)
        pendingStart = (started: onStarted, failed: onError)
        os_unfair_lock_unlock(&startLock)

        // Bring up the dedicated engine + click player. Any of these can
        // raise a raw NSException on a bad audio-session/format state
        // (e.g. input unavailable because MusicKit owns the session on a
        // real device) — wrap so it degrades to a clean reject.
        if let err = StudioObjC.catchExceptions({
            if !self.clickAttached {
                self.captureEngine.attach(self.clickPlayer)
                self.clickAttached = true
            }
        }) {
            teardown()
            onError("capture engine attach failed: \(err.localizedDescription)")
            return
        }

        do {
            if !captureEngine.isRunning {
                try captureEngine.start()
            }
        } catch {
            teardown()
            onError("capture engine start failed: \(error.localizedDescription)")
            return
        }

        // Wire the click player to the dedicated main mixer in the mixer's
        // negotiated output format (post-start, so the format is valid).
        // Build click buffers in that same format — a mono buffer fed into
        // a stereo bus silently drops (same lesson as Engine.swift).
        let clickFormat = captureEngine.mainMixerNode.outputFormat(forBus: 0)
        if let err = StudioObjC.catchExceptions({
            self.captureEngine.connect(self.clickPlayer, to: self.captureEngine.mainMixerNode, format: clickFormat)
        }) {
            teardown()
            onError("capture engine click wiring failed: \(err.localizedDescription)")
            return
        }
        clickPlayer.volume = max(0, min(1.5, clickVolume))
        clickBeatBuffer = ExternalRecorder.makeClickBuffer(format: clickFormat, frequency: 1000, durationMs: 30)
        clickAccentBuffer = ExternalRecorder.makeClickBuffer(format: clickFormat, frequency: 1500, durationMs: 30)

        // beats <= 0 → start capture immediately, no pre-roll.
        guard countInBeats > 0 else {
            beginCapture(onStarted: onStarted, onError: onError)
            return
        }

        // Native-clock count-in: one Timer per click, then a final timer
        // that begins capture. Mirrors Engine.playWithCountIn cadence.
        for i in 0..<countInBeats {
            let accent = (i == 0)
            let t = Timer(timeInterval: Double(i) * secondsPerBeat, repeats: false) { [weak self] _ in
                self?.playClick(accent: accent)
            }
            RunLoop.main.add(t, forMode: .common)
            countInTimers.append(t)
        }
        let startTimer = Timer(timeInterval: Double(countInBeats) * secondsPerBeat, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.beginCapture(onStarted: onStarted, onError: onError)
        }
        RunLoop.main.add(startTimer, forMode: .common)
        countInTimers.append(startTimer)
    }

    /// Install the input tap → WAV file. The start callback resolves from
    /// the FIRST tap buffer with an epoch stamp derived from that buffer's
    /// AVAudioTime — the wall-clock time the first captured sample was
    /// actually taken by the hardware, accurate even on Bluetooth /
    /// large-buffer routes where an install-time stamp runs early. If no
    /// buffer arrives within 1.5s (dead input: session has no record
    /// route), the watchdog tears down and errors.
    private func beginCapture(onStarted: @escaping (_ epochMs: Double) -> Void,
                              onError: @escaping (_ message: String) -> Void) {
        clearCountInTimers()

        let inputNode = captureEngine.inputNode
        let inFormat = inputNode.outputFormat(forBus: 0)
        // Guard against a zero/invalid input format (input unavailable) —
        // installing a tap with it crashes CoreAudio.
        guard inFormat.sampleRate > 0, inFormat.channelCount > 0 else {
            teardown()
            onError("microphone input unavailable (sampleRate=\(inFormat.sampleRate), channels=\(inFormat.channelCount))")
            return
        }

        let filename = "external-take-\(Int(Date().timeIntervalSince1970 * 1000)).wav"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        outputUrl = url

        // On-disk: 16-bit little-endian PCM WAV (universal, Web-Audio
        // decodable, matches StudioNativeRecorder). processingFormat stays
        // float32 to equal the tap buffer's format, so file.write converts
        // float → int16 internally. Strip the non-interleaved flag the
        // input format's settings may carry — it describes the tap's
        // in-memory layout, and leaking it into the FILE settings would
        // ask AVAudioFile for a non-interleaved WAV (invalid container).
        var settings = inFormat.settings
        settings[AVFormatIDKey] = kAudioFormatLinearPCM
        settings[AVLinearPCMBitDepthKey] = 16
        settings[AVLinearPCMIsFloatKey] = false
        settings[AVLinearPCMIsBigEndianKey] = false
        settings.removeValue(forKey: AVLinearPCMIsNonInterleaved)
        let outFile: AVAudioFile
        do {
            outFile = try AVAudioFile(forWriting: url,
                                      settings: settings,
                                      commonFormat: inFormat.commonFormat,
                                      interleaved: inFormat.isInterleaved)
        } catch {
            teardown()
            onError("could not open capture file: \(error.localizedDescription)")
            return
        }
        file = outFile

        // Re-arm the one-shot start callbacks BEFORE the tap goes in — the
        // first buffer can land on the audio thread immediately. (start()
        // already armed the same pair pre-count-in so a mid-pre-roll stop
        // settles the caller; this re-arm is a harmless overwrite.)
        os_unfair_lock_lock(&startLock)
        pendingStart = (started: onStarted, failed: onError)
        os_unfair_lock_unlock(&startLock)

        // NOTE: the closure captures `outFile` STRONGLY — the audio thread
        // writes to its own reference and never touches self.file, so a
        // main-thread `file = nil` can't yank the handle mid-write. The
        // file closes when the last reference dies after removeTap.
        if let err = StudioObjC.catchExceptions({
            inputNode.installTap(onBus: 0, bufferSize: 4096, format: inFormat) { [weak self] buffer, when in
                guard let self else { return }
                // Write on the audio thread — AVAudioFile.write is
                // real-time-unsafe in theory but is what Apple's own
                // capture samples do; the file is buffered.
                try? outFile.write(from: buffer)
                let db = ExternalRecorder.peakDb(buffer)
                os_unfair_lock_lock(&self.peakLock)
                self.latestPeakDb = db
                os_unfair_lock_unlock(&self.peakLock)

                // First buffer → resolve the start callback with an epoch
                // stamp back-computed from the buffer's host time: now,
                // minus how long ago the buffer's first sample was taken.
                // Drain under the lock so the watchdog / stop() can't
                // double-fire the callbacks.
                os_unfair_lock_lock(&self.startLock)
                let handler = self.pendingStart
                self.pendingStart = nil
                os_unfair_lock_unlock(&self.startLock)
                if let handler {
                    let nowHost = mach_absolute_time()
                    var ageSec = 0.0
                    if when.isHostTimeValid && nowHost > when.hostTime {
                        ageSec = AVAudioTime.seconds(forHostTime: nowHost - when.hostTime)
                    }
                    let epochMs = Date().timeIntervalSince1970 * 1000.0 - ageSec * 1000.0
                    DispatchQueue.main.async {
                        self.isArming = false
                        handler.started(epochMs)
                    }
                }
            }
        }) {
            teardown()
            onError("mic tap install failed: \(err.localizedDescription)")
            return
        }
        tapInstalled = true
        tapInstalledAt = Date()
        isCapturing = true
        startPeakTimer()
        NSLog("[ExternalRecorder] tap installed → \(filename); awaiting first buffer")

        // Watchdog: a tap against a dead input installs fine and then
        // never fires (a MusicKit-owned session with no record route is
        // the expected culprit). Convert that into a clean error instead
        // of a hung start call + silently empty take.
        watchdogTimer?.invalidate()
        let wd = Timer(timeInterval: 1.5, repeats: false) { [weak self] _ in
            guard let self else { return }
            os_unfair_lock_lock(&self.startLock)
            let handler = self.pendingStart
            self.pendingStart = nil
            os_unfair_lock_unlock(&self.startLock)
            guard let handler else { return }  // first buffer already arrived
            NSLog("[ExternalRecorder] watchdog: no input buffers after 1.5s — tearing down")
            self.teardown()
            handler.failed("no input buffers delivered — session has no record route")
        }
        RunLoop.main.add(wd, forMode: .common)
        watchdogTimer = wd
    }

    /// Stop the tap, close the file, tear down the dedicated engine.
    /// Returns (url, durationSec), or nil when there is nothing usable —
    /// never started, or the input was dead (ran >0.2s yet captured zero
    /// frames) — so the caller rejects instead of resolving an empty take.
    public func stop() -> (url: URL, durationSec: Double)? {
        // Drain a still-pending start (stop before the first buffer /
        // during count-in) so the caller's start promise fails instead of
        // hanging forever.
        os_unfair_lock_lock(&startLock)
        let pendingHandler = pendingStart
        pendingStart = nil
        os_unfair_lock_unlock(&startLock)

        guard isCapturing, let url = outputUrl else {
            // Not capturing — still clean up any half-built state.
            teardown()
            pendingHandler?.failed("capture stopped before it started")
            return nil
        }
        watchdogTimer?.invalidate(); watchdogTimer = nil
        peakTimer?.invalidate(); peakTimer = nil
        // Read length/format BEFORE removing the tap — per the file-handle
        // contract the main thread only reads metadata; writes belong to
        // the tap closure's own strong reference.
        let frames = file?.length ?? 0
        let sampleRate = file?.processingFormat.sampleRate ?? 48_000
        if tapInstalled {
            captureEngine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        // Drop the main-thread reference; the file actually closes when
        // the tap closure's strong reference is released post-removeTap.
        file = nil
        isCapturing = false
        isArming = false
        stopEngine()
        pendingHandler?.failed("capture stopped before first input buffer")

        let durationSec = sampleRate > 0 ? Double(frames) / sampleRate : 0
        let ranSec = tapInstalledAt.map { Date().timeIntervalSince($0) } ?? 0
        tapInstalledAt = nil
        if frames == 0 && ranSec > 0.2 {
            // The tap ran but nothing arrived — dead input. An empty WAV
            // resolved as success would upload a zero-length take.
            NSLog("[ExternalRecorder] stop: zero frames after \(String(format: "%.2f", ranSec))s — treating as failed capture")
            return nil
        }
        NSLog("[ExternalRecorder] capture stopped → \(url.lastPathComponent) (\(durationSec)s)")
        return (url, durationSec)
    }

    /// Full teardown for failure paths — remove tap, stop engine, drop the
    /// file handle and any pending count-in timers. Drains (silently) any
    /// pending start callbacks: error-path callers invoke onError
    /// themselves. Idempotent.
    public func teardown() {
        os_unfair_lock_lock(&startLock)
        pendingStart = nil
        os_unfair_lock_unlock(&startLock)
        clearCountInTimers()
        watchdogTimer?.invalidate(); watchdogTimer = nil
        peakTimer?.invalidate(); peakTimer = nil
        if tapInstalled {
            captureEngine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        file = nil
        tapInstalledAt = nil
        isCapturing = false
        isArming = false
        stopEngine()
    }

    private func stopEngine() {
        // stop(), not reset() — reset()-while-playing on an AVAudioPlayerNode
        // leaves isPlaying == true and renders permanent silence (the
        // documented empty-queue trap). We only ever stop() the click node.
        if let err = StudioObjC.catchExceptions({
            if self.clickPlayer.isPlaying { self.clickPlayer.stop() }
        }) {
            NSLog("[ExternalRecorder] click stop raised \(err.localizedDescription)")
        }
        clickNeedsRestart = true
        if captureEngine.isRunning { captureEngine.stop() }
    }

    private func clearCountInTimers() {
        for t in countInTimers { t.invalidate() }
        countInTimers.removeAll()
    }

    // MARK: - Click (reuses Studio's waveform + schedule-then-play ordering)

    private func playClick(accent: Bool) {
        guard let buf = accent ? clickAccentBuffer : clickBeatBuffer else { return }
        guard captureEngine.isRunning else { return }
        // Schedule BEFORE play(). play() on an AVAudioPlayerNode with an
        // empty queue never pulls the render callback — the corrective
        // play() must come AFTER a buffer is queued (Engine.playClick's
        // hard-won ordering). `.interrupts` re-anchors the node.
        if let err = StudioObjC.catchExceptions({
            self.clickPlayer.scheduleBuffer(buf, at: nil, options: [.interrupts], completionHandler: nil)
            if self.clickNeedsRestart || !self.clickPlayer.isPlaying {
                self.clickPlayer.play()
                self.clickNeedsRestart = false
            }
        }) {
            NSLog("[ExternalRecorder] click raised \(err.localizedDescription)")
        }
    }

    // MARK: - Peak metering

    private func startPeakTimer() {
        peakTimer?.invalidate()
        // ~30Hz on RunLoop.main — Capacitor plugin callbacks run on a
        // background queue with no run loop, so bind to main explicitly
        // (same requirement as StudioNativeRecorder's peak timer).
        let timer = Timer(timeInterval: 0.033, repeats: true) { [weak self] _ in
            guard let self, self.isCapturing else { return }
            os_unfair_lock_lock(&self.peakLock)
            let db = self.latestPeakDb
            os_unfair_lock_unlock(&self.peakLock)
            self.onPeak?(db)
        }
        RunLoop.main.add(timer, forMode: .common)
        peakTimer = timer
    }

    private static func peakDb(_ buffer: AVAudioPCMBuffer) -> Float {
        guard let channels = buffer.floatChannelData else { return -160 }
        let frameCount = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)
        var maxAbs: Float = 0
        for c in 0..<channelCount {
            let samples = channels[c]
            for i in 0..<frameCount {
                let v = abs(samples[i])
                if v > maxAbs { maxAbs = v }
            }
        }
        return maxAbs > 0 ? 20 * log10(maxAbs) : -160
    }

    /// Short windowed square-wave click in the given format. Identical
    /// waveform math to Engine.makeClickBuffer so the count-in sounds the
    /// same as Studio's metronome.
    private static func makeClickBuffer(format: AVAudioFormat, frequency: Double, durationMs: Double) -> AVAudioPCMBuffer? {
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
