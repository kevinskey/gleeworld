// GWCalendarPlugin — bridge to iOS EventKit so the app can read the
// user's local Calendar (iCloud, work, subscribed calendars) and post
// events to ios-calendar-sync. iOS 17 uses .requestFullAccessToEvents;
// earlier versions use the deprecated .requestAccess(to:) path.
//
// Registration lives in MainViewController.capacitorDidLoad — release
// dead-stripping removes unregistered plugins.

import Foundation
import Capacitor
import EventKit

@objc(GWCalendarPlugin)
public class GWCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GWCalendarPlugin"
    public let jsName = "GWCalendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkAccess",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readEvents",    returnType: CAPPluginReturnPromise),
    ]

    private let store = EKEventStore()

    private func statusString(_ s: EKAuthorizationStatus) -> String {
        switch s {
        case .notDetermined: return "notDetermined"
        case .restricted:    return "restricted"
        case .denied:        return "denied"
        case .authorized:    return "authorized"
        @unknown default:
            if #available(iOS 17.0, *) {
                if s == .fullAccess { return "authorized" }
                if s == .writeOnly  { return "writeOnly"  }
            }
            return "unknown"
        }
    }

    private func isGranted(_ s: EKAuthorizationStatus) -> Bool {
        if s == .authorized { return true }
        if #available(iOS 17.0, *) { return s == .fullAccess }
        return false
    }

    @objc func checkAccess(_ call: CAPPluginCall) {
        let s = EKEventStore.authorizationStatus(for: .event)
        call.resolve(["granted": isGranted(s), "status": statusString(s)])
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            store.requestFullAccessToEvents { [weak self] granted, _ in
                DispatchQueue.main.async {
                    let s = EKEventStore.authorizationStatus(for: .event)
                    call.resolve(["granted": self?.isGranted(s) ?? granted, "status": self?.statusString(s) ?? (granted ? "authorized" : "denied")])
                }
            }
        } else {
            store.requestAccess(to: .event) { [weak self] granted, _ in
                DispatchQueue.main.async {
                    let s = EKEventStore.authorizationStatus(for: .event)
                    call.resolve(["granted": granted, "status": self?.statusString(s) ?? (granted ? "authorized" : "denied")])
                }
            }
        }
    }

    @objc func readEvents(_ call: CAPPluginCall) {
        guard let fromIso = call.getString("fromIso"),
              let toIso   = call.getString("toIso"),
              let from    = ISO8601DateFormatter().date(from: fromIso),
              let to      = ISO8601DateFormatter().date(from: toIso)
        else {
            call.reject("bad_window")
            return
        }
        let s = EKEventStore.authorizationStatus(for: .event)
        if !isGranted(s) {
            call.reject("not_authorized")
            return
        }

        // Enumerate calendars, skipping the built-in Birthdays source
        // (noisy, no useful title/notes).
        let allCalendars = store.calendars(for: .event).filter { cal in
            cal.source.sourceType != .birthdays
        }
        let predicate = store.predicateForEvents(withStart: from, end: to, calendars: allCalendars)
        let events = store.events(matching: predicate)

        let iso = ISO8601DateFormatter()
        let formatted: [[String: Any]] = events.compactMap { ev in
            // Skip pure clutter (no title, no notes, no attendees).
            let title = ev.title ?? ""
            let hasNotes = (ev.notes ?? "").isEmpty == false
            let hasAttendees = (ev.attendees?.isEmpty == false)
            if title.isEmpty && !hasNotes && !hasAttendees { return nil }

            let isPrivate: Bool = {
                if ev.availability == .busy && (ev.calendar.title.lowercased().contains("personal")) { return true }
                return false
            }()

            var row: [String: Any] = [
                "ekId":          ev.eventIdentifier ?? UUID().uuidString,
                "calendarTitle": ev.calendar.title,
                "title":         title,
                "description":   ev.notes ?? NSNull(),
                "location":      ev.location ?? NSNull(),
                "startAt":       iso.string(from: ev.startDate),
                "endAt":         iso.string(from: ev.endDate),
                "allDay":        ev.isAllDay,
                "isPrivate":     isPrivate,
            ]
            // Prune NSNull for JSON cleanliness.
            row = row.compactMapValues { ($0 is NSNull) ? nil : $0 }
            return row
        }

        call.resolve(["events": formatted])
    }
}
