// GWSpeechPlugin
//
// Speech-to-text bridge for the Assistant. iOS WebKit has no Web Speech
// recognition API (window.SpeechRecognition is undefined in WKWebView),
// so the Assistant mic was dead in the app — this plugin taps the mic
// through a dedicated AVAudioEngine and streams SFSpeechRecognizer
// transcripts over the Capacitor bridge instead. Output (speechSynthesis)
// works fine in WKWebView, so only input lives here.
//
// Session contract (mirrors the web SpeechRecognition shape the facade
// expects): partial transcripts stream as speechResult{isFinal:false};
// exactly one speechResult{isFinal:true} (silence-finalize, Apple final,
// or explicit stop) followed by exactly one speechEnd per session.
//
// Threading: recognition + tap callbacks arrive on private queues;
// notifyListeners is main-thread-only (same constraint as the other
// plugins), so all session state is confined to the main queue.
//
// AVAudioSession: .playAndRecord/.measurement with .duckOthers while
// listening, deactivated with .notifyOthersOnDeactivation on finish so
// Studio / Apple Music resume cleanly (see the iOS audio recording
// reference doc for the ordering traps).

import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(GWSpeechPlugin)
public class GWSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GWSpeechPlugin"
    public let jsName = "GWSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var audioEngine: AVAudioEngine?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var silenceTimer: Timer?
    private var lastTranscript = ""
    private var running = false
    // Bumped on every finish so a stale recognition callback (they keep
    // arriving briefly after cancel()) can never touch the next session.
    private var generation = 0

    // Web SpeechRecognition ends an utterance after ~1–2s of silence;
    // SFSpeechRecognizer keeps listening forever, so we finalize ourselves.
    private static let silenceSeconds: TimeInterval = 1.6

    @objc func start(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { [weak self] auth in
            guard auth == .authorized else {
                call.reject("speech recognition not authorized")
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else {
                    call.reject("microphone not authorized")
                    return
                }
                DispatchQueue.main.async { self?.beginSession(call) }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.finishSession()
            call.resolve()
        }
    }

    // MARK: - Session lifecycle (main queue only)

    private func beginSession(_ call: CAPPluginCall) {
        if running { call.resolve(); return }
        guard let recognizer, recognizer.isAvailable else {
            call.reject("speech recognizer unavailable")
            return
        }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            call.reject("audio session activation failed: \(error.localizedDescription)")
            return
        }

        let engine = AVAudioEngine()
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        // A zero-sample-rate format means the input node is dead (no mic
        // route); installTap would throw an uncatchable NSException.
        guard format.sampleRate > 0 else {
            Self.deactivateAudioSession()
            call.reject("no microphone input route")
            return
        }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            req.append(buffer)
        }

        engine.prepare()
        // engine.start() can fail two ways: a Swift error, or an ObjC
        // NSException that Swift do/catch cannot catch (SIGABRT) — route
        // the latter through StudioObjC like Engine.swift does.
        var swiftStartError: Error?
        let objcStartError = StudioObjC.catchExceptions({
            do { try engine.start() } catch { swiftStartError = error }
        })
        if objcStartError != nil || swiftStartError != nil {
            let reason = objcStartError?.localizedDescription
                ?? swiftStartError?.localizedDescription ?? "unknown"
            input.removeTap(onBus: 0)
            Self.deactivateAudioSession()
            call.reject("audio engine start failed: \(reason)")
            return
        }

        audioEngine = engine
        request = req
        lastTranscript = ""
        running = true
        generation += 1
        let myGeneration = generation

        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, self.running, self.generation == myGeneration else { return }
                if let result {
                    let transcript = result.bestTranscription.formattedString
                    self.lastTranscript = transcript
                    if result.isFinal {
                        self.finishSession()
                        return
                    }
                    self.notifyListeners("speechResult", data: ["transcript": transcript, "isFinal": false])
                    self.armSilenceTimer()
                }
                if error != nil {
                    // Includes cancellation of a session we already tore
                    // down (guarded above) and real audio/recognition
                    // failures — either way the session is over.
                    self.finishSession()
                }
            }
        }
        armSilenceTimer()
        call.resolve()
    }

    private func armSilenceTimer() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: Self.silenceSeconds, repeats: false) { [weak self] _ in
            self?.finishSession()
        }
    }

    private func finishSession() {
        guard running else { return }
        running = false
        generation += 1

        silenceTimer?.invalidate()
        silenceTimer = nil

        if !lastTranscript.isEmpty {
            notifyListeners("speechResult", data: ["transcript": lastTranscript, "isFinal": true])
        }

        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil

        if let engine = audioEngine {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
        }
        audioEngine = nil
        Self.deactivateAudioSession()

        notifyListeners("speechEnd", data: [:])
    }

    private static func deactivateAudioSession() {
        // Best effort — hand the session back so Studio / Apple Music
        // playback un-ducks and resumes.
        let session = AVAudioSession.sharedInstance()
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
        // Restore the launch-time configuration (AppDelegate: .playback +
        // .mixWithOthers, active). setActive(false) alone left the category
        // stuck on .playAndRecord/.measurement, so the assistant's spoken
        // reply — which the webview plays immediately after a mic turn —
        // re-activated the session in recording mode and came out silent /
        // earpiece-routed on device. Same failure class the comment in
        // AudioSessionConfigPlugin.restoreDefault documents for MPMusicPlayer.
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
    }
}
