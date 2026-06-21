// RecordingLiveActivityPlugin
//
// Drives an iOS 16.2+ ActivityKit Live Activity that shows the
// currently-rolling take on the lock screen and in the Dynamic Island
// (iPhone 14 Pro+ / 15 / 16+). The user can park the phone on a stand,
// lock the screen, and still see "Recording: Bass · 0:42" plus a stop
// button without unlocking.
//
// IMPORTANT: this plugin starts/updates/ends the activity, but the
// widget extension that renders the UI MUST be added separately in
// Xcode:
//
//     File → New → Target → Widget Extension
//     Name it `RecordingLiveActivityExtension`, enable
//     "Include Live Activity". Move the ActivityAttributes struct
//     below into a file shared by both the app and the extension
//     target (a separate `Sources/` group works), then implement the
//     widget's UI in the extension.
//
// Until the widget extension is added, calls from JS just no-op
// (the start() returns a `widgetMissing: true` flag).

import Foundation
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

// The ActivityAttributes type lives in
// `ios/App/Shared/GleeWorldRecordingAttributes.swift` so the App and
// the RecordingLiveActivityExtension widget target can share the same
// payload. Make sure that file is added to BOTH targets in Xcode.

@objc(RecordingLiveActivityPlugin)
public class RecordingLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RecordingLiveActivityPlugin"
    public let jsName = "RecordingLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    // Stored as `Any?` because `@available(iOS 16.2, *)` cannot gate a
    // stored property — the type system needs a sized container at
    // compile time regardless of OS version. We downcast back to
    // `Activity<GleeWorldRecordingAttributes>?` inside availability
    // blocks at the use sites.
    private var activityAny: Any?

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            #if canImport(ActivityKit)
            let supported = ActivityAuthorizationInfo().areActivitiesEnabled
            call.resolve([ "supported": supported ])
            return
            #endif
        }
        call.resolve([ "supported": false ])
    }

    @objc func start(_ call: CAPPluginCall) {
        let projectTitle = call.getString("projectTitle") ?? "Project"
        let partLabel = call.getString("partLabel") ?? "Vocal"

        if #available(iOS 16.2, *) {
            #if canImport(ActivityKit)
            // If a previous activity is still alive, end it first so we
            // don't pile up overlapping live activities.
            if let existing = self.activityAny as? Activity<GleeWorldRecordingAttributes> {
                Task { await existing.end(nil, dismissalPolicy: .immediate) }
                self.activityAny = nil
            }

            let attributes = GleeWorldRecordingAttributes(projectTitle: projectTitle)
            let state = GleeWorldRecordingAttributes.RecordingContentState(
                partLabel: partLabel,
                startedAtUnixSeconds: Date().timeIntervalSince1970,
                isPaused: false
            )

            do {
                let started = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: nil
                )
                self.activityAny = started
                call.resolve([ "started": true, "id": started.id ])
            } catch {
                call.resolve([ "started": false, "widgetMissing": true, "reason": error.localizedDescription ])
            }
            return
            #endif
        }
        call.resolve([ "started": false, "reason": "iOS 16.2 or higher required" ])
    }

    @objc func update(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            #if canImport(ActivityKit)
            guard let activity = self.activityAny as? Activity<GleeWorldRecordingAttributes> else {
                call.resolve([ "updated": false ])
                return
            }
            let partLabel = call.getString("partLabel") ?? "Vocal"
            let isPaused = call.getBool("isPaused") ?? false
            let startedAt = call.getDouble("startedAtUnixSeconds") ?? Date().timeIntervalSince1970
            let state = GleeWorldRecordingAttributes.RecordingContentState(
                partLabel: partLabel,
                startedAtUnixSeconds: startedAt,
                isPaused: isPaused
            )
            Task {
                await activity.update(.init(state: state, staleDate: nil))
                call.resolve([ "updated": true ])
            }
            return
            #endif
        }
        call.resolve([ "updated": false ])
    }

    @objc func end(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            #if canImport(ActivityKit)
            guard let activity = self.activityAny as? Activity<GleeWorldRecordingAttributes> else {
                call.resolve([ "ended": false ])
                return
            }
            Task {
                await activity.end(nil, dismissalPolicy: .immediate)
                self.activityAny = nil
                call.resolve([ "ended": true ])
            }
            return
            #endif
        }
        call.resolve([ "ended": false ])
    }
}
