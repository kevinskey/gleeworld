// MainViewController
//
// Subclasses Capacitor's bridge view controller so we can explicitly
// register the three local plugins (AudioSessionConfig, NativeMusicKit,
// RecordingLiveActivity). The `CAPBridgedPlugin` protocol is supposed
// to drive auto-discovery via `objc_getClassList`, but in this app's
// release-style build the linker dead-strips the classes because
// nothing else references them — so JS calls fall through to the "not
// implemented on ios" stub. Registering explicitly bypasses that.

import UIKit
import Capacitor
import WebKit

class MainViewController: CAPBridgeViewController {
    // The WKWebView's edge-swipe walks browser history. In a single-page app
    // that reads as "swiping right changes pages" — the app appears to navigate
    // on its own. Nothing in GleeWorld should page on a swipe except the score
    // viewer, which handles its own touches to paginate.
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = false
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AudioSessionConfigPlugin())
        bridge?.registerPluginInstance(NativeMusicKitPlugin())
        // StudioEnginePlugin — the AVAudioEngine bridge for Studio. Same
        // dead-strip problem as the others, same explicit fix.
        bridge?.registerPluginInstance(StudioEnginePlugin())
        // GWMidiPlugin — CoreMIDI input bridge (iOS WebKit has no Web
        // MIDI). Same dead-strip problem as the others, same explicit fix.
        bridge?.registerPluginInstance(GWMidiPlugin())
        // GWSpeechPlugin — Assistant speech-to-text (iOS WebKit has no
        // SpeechRecognition). Same dead-strip problem, same explicit fix.
        bridge?.registerPluginInstance(GWSpeechPlugin())
        // GWCalendarPlugin — EventKit bridge so the app can read the user's
        // local Calendar and surface events alongside the choir schedule.
        bridge?.registerPluginInstance(GWCalendarPlugin())
        // RecordingLiveActivityPlugin disabled — needs widget extension's
        // GleeWorldRecordingAttributes type that's not in the main target.
    }
}
