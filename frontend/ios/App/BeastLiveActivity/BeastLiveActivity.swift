import ActivityKit
import SwiftUI
import WidgetKit

private let accent = Color(red: 1.0, green: 0.27, blue: 0.23)

private func clock(_ seconds: Int) -> String {
    String(format: "%d:%02d", max(0, seconds) / 60, max(0, seconds) % 60)
}

/// The rest countdown. While running, iOS draws the ticking itself from the absolute end time, so
/// it stays live with the app asleep; once the end has passed (or the system calls the activity
/// stale) it reads "Ready" instead of sitting on 0:00.
private struct RestClock: View {
    let state: BeastActivityAttributes.ContentState
    let isStale: Bool

    var body: some View {
        switch state.restState {
        case "running":
            if isStale || state.restEndsAt <= Date() || state.restStartedAt >= state.restEndsAt {
                Text(state.readyLabel).foregroundStyle(accent)
            } else {
                Text(timerInterval: state.restStartedAt...state.restEndsAt, countsDown: true)
                    .monospacedDigit()
            }
        case "paused":
            HStack(spacing: 4) {
                Image(systemName: "pause.fill").font(.caption)
                Text(clock(state.pausedLeft)).monospacedDigit()
            }
        case "ready":
            Text(state.readyLabel).foregroundStyle(accent)
        default:
            EmptyView()
        }
    }
}

private struct LockScreenView: View {
    let workoutName: String
    let state: BeastActivityAttributes.ContentState
    let isStale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "dumbbell.fill").foregroundStyle(accent)
                Text(workoutName).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Spacer()
                RestClock(state: state, isStale: isStale).font(.title2.weight(.semibold))
            }
            Text(state.title).font(.headline).lineLimit(1)
            Text(state.detail).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            if state.restState == "running", !isStale, state.restStartedAt < state.restEndsAt, state.restEndsAt > Date() {
                ProgressView(timerInterval: state.restStartedAt...state.restEndsAt, countsDown: true) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(accent)
            }
        }
        .padding(16)
    }
}

struct BeastLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BeastActivityAttributes.self) { context in
            LockScreenView(workoutName: context.attributes.workoutName, state: context.state, isStale: context.isStale)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "dumbbell.fill").foregroundStyle(accent)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    RestClock(state: context.state, isStale: context.isStale).font(.title3.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.title).font(.headline).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.detail).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill").foregroundStyle(accent)
            } compactTrailing: {
                RestClock(state: context.state, isStale: context.isStale)
                    .font(.caption.weight(.semibold))
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: "dumbbell.fill").foregroundStyle(accent)
            }
            .keylineTint(accent)
        }
    }
}
