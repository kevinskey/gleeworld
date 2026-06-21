// RecordingLiveActivityBundle
//
// Widget bundle entry point for the GleeWorld Part Tracks
// "now recording" Live Activity. The bundle wraps one widget; iOS
// drives it through the ActivityKit calls our `RecordingLiveActivity`
// Capacitor plugin makes from the JS layer.
//
// To compile this file, add it to the
// `RecordingLiveActivityExtension` widget target's "Compile Sources"
// build phase, along with the shared
// `GleeWorldRecordingAttributes.swift`.

import SwiftUI
import WidgetKit

@main
struct RecordingLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            RecordingLiveActivityWidget()
        }
    }
}
