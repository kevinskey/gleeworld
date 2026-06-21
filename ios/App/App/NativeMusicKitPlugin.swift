// NativeMusicKitPlugin
//
// Bridges iOS 15+ MusicKit (the native framework, not the JS shim)
// into Capacitor so the Part Tracks studio can use the system Apple
// Music player for backing-track playback. Replaces the JS MusicKit
// path on iOS — no more auth popups, no more 6s playbackState waits,
// no more setQueue race when the app is foregrounded mid-call.
//
// Methods:
//   requestAuthorization()              – ask the user once for Music access
//   setQueueWithSongId({ id })          – queue a single song
//   setQueueWithAlbumId({ id })         – queue every track of an album
//   play() / pause() / stop()
//   seekTo({ seconds })
//   getState()                          – playback state + current time
//
// Events emitted to JS:
//   playbackStateChanged { state: 'playing'|'paused'|'stopped'|'loading' }
//   playbackTimeChanged  { currentTime, duration }
//
// All time values are in seconds (float). The state strings mirror what
// our JS code already expects from MusicKit JS so the rest of the
// studio can stay codec-agnostic.

import Foundation
import Capacitor
import MediaPlayer
#if canImport(MusicKit)
import MusicKit
#endif

@objc(NativeMusicKitPlugin)
public class NativeMusicKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMusicKitPlugin"
    public let jsName = "NativeMusicKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setQueueWithSongId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setQueueWithAlbumId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seekTo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
    ]

    // The Music app's system music player is shared with the actual
    // Apple Music client — pausing the studio's backing pauses Music
    // app playback too. We use the application player instead, which
    // owns its own queue and state independent of the user's Music app.
    private let player = MPMusicPlayerController.applicationMusicPlayer
    private var timeObserver: Timer?

    override public func load() {
        let center = NotificationCenter.default
        center.addObserver(self,
            selector: #selector(playbackStateChanged),
            name: .MPMusicPlayerControllerPlaybackStateDidChange,
            object: player)
        center.addObserver(self,
            selector: #selector(nowPlayingItemChanged),
            name: .MPMusicPlayerControllerNowPlayingItemDidChange,
            object: player)
        player.beginGeneratingPlaybackNotifications()

        // Lightweight time poll so the JS layer can keep its
        // transport playhead in sync with Apple Music.
        DispatchQueue.main.async {
            self.timeObserver = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
                guard let self = self, self.player.playbackState == .playing else { return }
                let t = self.player.currentPlaybackTime
                let d = self.player.nowPlayingItem?.playbackDuration ?? 0
                self.notifyListeners("playbackTimeChanged", data: [
                    "currentTime": t.isFinite ? t : 0,
                    "duration": d,
                ])
            }
        }
    }

    deinit {
        timeObserver?.invalidate()
        player.endGeneratingPlaybackNotifications()
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - State

    @objc func isAvailable(_ call: CAPPluginCall) {
        // iOS 15+ has MusicKit framework; earlier iOS still has
        // MPMusicPlayerController for catalog playback via store IDs.
        call.resolve([ "available": true ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            #if canImport(MusicKit)
            Task {
                let status = await MusicAuthorization.request()
                let ok = status == .authorized
                let reason: String
                switch status {
                case .authorized: reason = "authorized"
                case .denied: reason = "denied"
                case .restricted: reason = "restricted"
                case .notDetermined: reason = "notDetermined"
                @unknown default: reason = "unknown"
                }
                call.resolve([ "authorized": ok, "status": reason ])
            }
            return
            #endif
        }
        // Fallback for older iOS — Music app authorization via MPMediaLibrary.
        MPMediaLibrary.requestAuthorization { status in
            let ok = status == .authorized
            let reason: String
            switch status {
            case .authorized: reason = "authorized"
            case .denied: reason = "denied"
            case .restricted: reason = "restricted"
            case .notDetermined: reason = "notDetermined"
            @unknown default: reason = "unknown"
            }
            call.resolve([ "authorized": ok, "status": reason ])
        }
    }

    // MARK: - Queue + transport

    @objc func setQueueWithSongId(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing required parameter: id")
            return
        }
        let descriptor = MPMusicPlayerStoreQueueDescriptor(storeIDs: [id])
        player.setQueue(with: descriptor)
        player.prepareToPlay { error in
            if let error = error {
                call.reject("setQueueWithSongId prepare failed: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }

    @objc func setQueueWithAlbumId(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing required parameter: id")
            return
        }
        // MPMusicPlayerStoreQueueDescriptor doesn't expose albums
        // directly — but a play-parameters descriptor with the album
        // store ID does the right thing.
        let descriptor = MPMusicPlayerPlayParametersQueueDescriptor(
            playParametersQueue: [
                MPMusicPlayerPlayParameters(dictionary: [
                    "id": id,
                    "kind": "album",
                ])!,
            ]
        )
        player.setQueue(with: descriptor)
        player.prepareToPlay { error in
            if let error = error {
                call.reject("setQueueWithAlbumId prepare failed: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        player.play()
        call.resolve()
    }

    @objc func pause(_ call: CAPPluginCall) {
        player.pause()
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        player.stop()
        call.resolve()
    }

    @objc func seekTo(_ call: CAPPluginCall) {
        let seconds = call.getDouble("seconds") ?? 0
        player.currentPlaybackTime = TimeInterval(seconds)
        call.resolve()
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        // MPMusicPlayerController doesn't expose a per-player volume —
        // we route the user's slider into the system volume instead.
        // No-op for now; JS falls back to its current behavior.
        call.resolve([ "supported": false ])
    }

    @objc func getState(_ call: CAPPluginCall) {
        call.resolve([
            "state": describeState(player.playbackState),
            "currentTime": player.currentPlaybackTime.isFinite ? player.currentPlaybackTime : 0,
            "duration": player.nowPlayingItem?.playbackDuration ?? 0,
            "nowPlayingTitle": player.nowPlayingItem?.title ?? "",
            "nowPlayingArtist": player.nowPlayingItem?.artist ?? "",
        ])
    }

    // MARK: - Notifications

    @objc private func playbackStateChanged() {
        notifyListeners("playbackStateChanged", data: [
            "state": describeState(player.playbackState),
        ])
    }

    @objc private func nowPlayingItemChanged() {
        notifyListeners("nowPlayingItemChanged", data: [
            "title": player.nowPlayingItem?.title ?? "",
            "artist": player.nowPlayingItem?.artist ?? "",
            "duration": player.nowPlayingItem?.playbackDuration ?? 0,
        ])
    }

    private func describeState(_ state: MPMusicPlaybackState) -> String {
        switch state {
        case .stopped: return "stopped"
        case .playing: return "playing"
        case .paused: return "paused"
        case .interrupted: return "interrupted"
        case .seekingForward: return "seekingForward"
        case .seekingBackward: return "seekingBackward"
        @unknown default: return "unknown"
        }
    }
}
