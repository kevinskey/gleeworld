// Discrete Studio engine event names. The engine emits these via its
// `onEvent` callback (wired to Capacitor `notifyListeners` in the plugin),
// replacing the single monolithic "state" event with named, typed events
// the React layer subscribes to through one remount-safe hook.

import Foundation

public enum StudioEvents {
    public static let ready = "studioEngineReady"
    public static let error = "studioEngineError"
    public static let playbackStarted = "playbackStarted"
    public static let playbackPaused = "playbackPaused"
    public static let playbackStopped = "playbackStopped"
    public static let positionChanged = "playbackPositionChanged"
    public static let trackLoaded = "trackLoaded"
    public static let trackFailed = "trackFailed"
    public static let effectAdded = "effectAdded"
    public static let effectRemoved = "effectRemoved"
    public static let effectBypassed = "effectBypassed"
    public static let effectParameterChanged = "effectParameterChanged"
    public static let routeChanged = "routeChanged"
    public static let audioInterrupted = "audioInterrupted"
    public static let engineRecovered = "engineRecovered"
}
