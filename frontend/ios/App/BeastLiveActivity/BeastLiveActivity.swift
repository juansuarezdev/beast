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

private func plain(_ v: Double) -> String {
    v.rounded() == v ? String(Int(v)) : String(format: "%g", v)
}

/// A number of the next set with its − and + buttons: weight, reps, seconds, minutes or speed,
/// whichever this kind of exercise has. The buttons run in the app's process (AdjustSetIntent).
private struct FieldStepper: View {
    let slot: Int
    let field: BeastField

    var body: some View {
        HStack(spacing: 6) {
            Button(intent: AdjustSetIntent(slot: slot, direction: -1)) {
                Image(systemName: "minus.circle.fill").font(.title2)
            }
            .buttonStyle(.plain)
            Text(plain(field.v) + (field.u.isEmpty ? "" : " " + field.u))
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(primaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(minWidth: 56)
            Button(intent: AdjustSetIntent(slot: slot, direction: 1)) {
                Image(systemName: "plus.circle.fill").font(.title2)
            }
            .buttonStyle(.plain)
        }
        .foregroundStyle(accent)
        .frame(maxWidth: .infinity)
    }
}

/// What the lock screen lets the lifter do to the next set: nudge its numbers, then tick it. Shown
/// while a next set exists and no rest is running (or the rest has run out). iOS 17 and later,
/// where a Live Activity can hold buttons.
private struct SetControls: View {
    let state: BeastActivityAttributes.ContentState
    let isStale: Bool

    static func showing(_ state: BeastActivityAttributes.ContentState, isStale: Bool) -> Bool {
        guard state.hasQueue else { return false }
        if state.restState != "running" { return true }
        return isStale || state.restEndsAt <= Date()
    }

    var body: some View {
        if Self.showing(state, isStale: isStale) {
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach(Array(state.fields.enumerated()), id: \.offset) { slot, field in
                        FieldStepper(slot: slot, field: field)
                    }
                }
                Button(intent: CompleteSetIntent()) {
                    Label(state.doneLabel, systemImage: "checkmark")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .tint(accent)
            }
        }
    }
}

private struct LockScreenView: View {
    let workoutName: String
    let state: BeastActivityAttributes.ContentState
    let isStale: Bool

    private var controls: Bool { SetControls.showing(state, isStale: isStale) }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "dumbbell.fill").foregroundStyle(accent)
                Text(controls && !state.setLabel.isEmpty ? workoutName + " · " + state.setLabel : workoutName)
                    .font(.caption).foregroundStyle(secondaryText).lineLimit(1)
                Spacer()
                RestClock(state: state, isStale: isStale).font(.title2.weight(.semibold))
            }
            Text(state.title).font(.headline).foregroundStyle(primaryText).lineLimit(1)
            if !controls {
                Text(state.detail).font(.subheadline).foregroundStyle(secondaryText).lineLimit(1)
            }
            if state.restState == "running", !isStale, state.restStartedAt < state.restEndsAt, state.restEndsAt > Date() {
                ProgressView(timerInterval: state.restStartedAt...state.restEndsAt, countsDown: true) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(accent)
            }
            SetControls(state: state, isStale: isStale)
        }
        .padding(14)
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
                        if !SetControls.showing(context.state, isStale: context.isStale) {
                            Text(context.state.detail).font(.subheadline).foregroundStyle(secondaryText).lineLimit(1)
                        }
                        SetControls(state: context.state, isStale: context.isStale)
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
