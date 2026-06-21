// GleeWorldRecordingAttributes
//
// SHARED between the App target and the
// RecordingLiveActivityExtension widget target. Must be added to both
// targets' "Compile Sources" build phase in Xcode — the activity
// payload that the app sends to ActivityKit has to deserialize to the
// exact same Swift type the widget uses to render.
//
// Anything you'd want to draw in the lock screen banner or Dynamic
// Island over the lifetime of one recording lives in the ContentState1
// (mutable). Anything fixed for the whole take (project title) lives
// on the top-level Attributes (immutable).

import Foundation
import ActivityKit

@available(iOS 16.2, *)
public struct GleeWorldRecordingAttributes: ActivityAttributes {
    public typealias ContentState = RecordingContentState

    public struct RecordingContentState: Codable, Hashable {
        public var partLabel: String
        public var startedAtUnixSeconds: Double
        public var isPaused: Bool

        public init(partLabel: String, startedAtUnixSeconds: Double, isPaused: Bool) {
            self.partLabel = partLabel
            self.startedAtUnixSeconds = startedAtUnixSeconds
            self.isPaused = isPaused
        }
    }

    public var projectTitle: String

    public init(projectTitle: String) {
        self.projectTitle = projectTitle
    }
}
