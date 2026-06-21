// RecordingLiveActivityWidget
//
// SwiftUI view that renders the "Recording: <part>" state on the lock
// screen and in the Dynamic Island while a Part Tracks take is rolling.
// The plugin in `App/App/RecordingLiveActivityPlugin.swift` starts +
// updates + ends the activity; this file just describes what it
// looks like.
//
// Three surfaces to paint:
//
//   - **Lock screen banner** (every iPhone): a small card pinned to
//     the lock screen, shown until the user dismisses it or the
//     activity ends.
//   - **Dynamic Island compact** (iPhone 14 Pro+ / 15+ / 16+):
//     a tiny leading + trailing pair around the pill.
//   - **Dynamic Island expanded**: the full pull-down panel.
//   - **Dynamic Island minimal**: a single glyph when multiple
//     activities are competing for the island.
//
// The elapsed-time strings update *automatically* via
// `Text(timerInterval:)` — no push updates needed every second.

import SwiftUI
import WidgetKit
import ActivityKit

@available(iOS 16.2, *)
struct RecordingLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GleeWorldRecordingAttributes.self) { context in
            LockScreenView(state: context.state, projectTitle: context.attributes.projectTitle)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded layout (lock-screen-style pull-down).
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(.red)
                            .frame(width: 8, height: 8)
                        Text(context.state.partLabel)
                            .font(.system(.caption, design: .rounded).weight(.semibold))
                            .foregroundStyle(.white)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if !context.state.isPaused {
                        Text(
                            timerInterval: Date(timeIntervalSince1970: context.state.startedAtUnixSeconds)...Date.distantFuture,
                            countsDown: false
                        )
                        .monospacedDigit()
                        .font(.system(.caption, design: .rounded).weight(.medium))
                        .foregroundStyle(.white.opacity(0.9))
                        .frame(maxWidth: 70)
                    } else {
                        Text("Paused")
                            .font(.system(.caption, design: .rounded).weight(.medium))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.projectTitle)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.isPaused
                         ? "Take paused — open GleeWorld to resume"
                         : "Recording — keep the phone close")
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(.white.opacity(0.55))
                        .padding(.bottom, 2)
                }
            } compactLeading: {
                Image(systemName: "waveform")
                    .foregroundStyle(.red)
            } compactTrailing: {
                if !context.state.isPaused {
                    Text(
                        timerInterval: Date(timeIntervalSince1970: context.state.startedAtUnixSeconds)...Date.distantFuture,
                        countsDown: false
                    )
                    .monospacedDigit()
                    .font(.system(.caption2, design: .rounded).weight(.semibold))
                    .frame(maxWidth: 50)
                } else {
                    Image(systemName: "pause.fill")
                        .foregroundStyle(.white.opacity(0.7))
                }
            } minimal: {
                Image(systemName: "waveform")
                    .foregroundStyle(.red)
            }
            .keylineTint(.red)
        }
    }
}

// MARK: - Lock-screen view

@available(iOS 16.2, *)
private struct LockScreenView: View {
    let state: GleeWorldRecordingAttributes.ContentState
    let projectTitle: String

    var body: some View {
        HStack(spacing: 12) {
            // Pulsing red dot to read instantly as "rolling."
            ZStack {
                Circle()
                    .fill(.red.opacity(0.25))
                    .frame(width: 28, height: 28)
                Circle()
                    .fill(.red)
                    .frame(width: 12, height: 12)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(state.isPaused ? "Take paused" : "Recording")
                    .font(.system(.caption, design: .rounded).weight(.bold))
                    .foregroundStyle(.white)
                    .textCase(.uppercase)
                    .kerning(1.2)
                HStack(spacing: 6) {
                    Text(state.partLabel)
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text("·")
                        .font(.system(.body, design: .rounded))
                        .foregroundStyle(.white.opacity(0.4))
                    Text(projectTitle)
                        .font(.system(.callout, design: .rounded))
                        .foregroundStyle(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }

            Spacer()

            if state.isPaused {
                Image(systemName: "pause.fill")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.8))
            } else {
                Text(
                    timerInterval: Date(timeIntervalSince1970: state.startedAtUnixSeconds)...Date.distantFuture,
                    countsDown: false
                )
                .monospacedDigit()
                .font(.system(.title3, design: .rounded).weight(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: 80, alignment: .trailing)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
