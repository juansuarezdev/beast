import ActivityKit
import SwiftUI
import WidgetKit

private let accent = Color(red: 1.0, green: 0.27, blue: 0.23)
// The card has its own dark background, so its text is fixed instead of following the phone's
// light or dark mode (which left black text on black).
private let primaryText = Color.white
private let secondaryText = Color.white.opacity(0.7)

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
                    .foregroundStyle(primaryText)
            }
        case "paused":
            HStack(spacing: 4) {
                Image(systemName: "pause.fill").font(.caption)
                Text(clock(state.pausedLeft)).monospacedDigit()
            }
            .foregroundStyle(primaryText)
        case "ready":
            Text(state.readyLabel).foregroundStyle(accent)
        default:
            EmptyView()
        }
    }
}

/// The button that ticks the next set. Shown while a next set exists and no rest is running (or
/// the rest has run out); iOS 17 and later, where a Live Activity can hold a button.
private struct DoneButton: View {
    let state: BeastActivityAttributes.ContentState
    let isStale: Bool

    private var showing: Bool {
        guard state.hasQueue else { return false }
        if state.restState != "running" { return true }
        return isStale || state.restEndsAt <= Date()
    }

    var body: some View {
        if showing {
            Button(intent: CompleteSetIntent()) {
                Label(state.doneLabel, systemImage: "checkmark")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
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
                Text(workoutName).font(.caption).foregroundStyle(secondaryText).lineLimit(1)
                Spacer()
                RestClock(state: state, isStale: isStale).font(.title2.weight(.semibold))
            }
            Text(state.title).font(.headline).foregroundStyle(primaryText).lineLimit(1)
            Text(state.detail).font(.subheadline).foregroundStyle(secondaryText).lineLimit(1)
            if state.restState == "running", !isStale, state.restStartedAt < state.restEndsAt, state.restEndsAt > Date() {
                ProgressView(timerInterval: state.restStartedAt...state.restEndsAt, countsDown: true) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(accent)
            }
            DoneButton(state: state, isStale: isStale)
        }
        .padding(16)
    }
}

struct BeastLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BeastActivityAttributes.self) { context in
            LockScreenView(workoutName: context.attributes.workoutName, state: context.state, isStale: context.isStale)
                .activityBackgroundTint(Color(red: 0.09, green: 0.09, blue: 0.10))
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
                    Text(context.state.title).font(.headline).foregroundStyle(primaryText).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        Text(context.state.detail).font(.subheadline).foregroundStyle(secondaryText).lineLimit(1)
                        DoneButton(state: context.state, isStale: context.isStale)
                    }
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
