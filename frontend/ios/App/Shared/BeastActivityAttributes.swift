import ActivityKit
import Foundation

/// The data a running workout hands to its Live Activity (lock screen + Dynamic Island).
/// Compiled into both the app (which starts and updates the activity) and the widget extension
/// (which draws it). Every string arrives already translated and formatted from the web side
/// (frontend/src/lib/live-activity.js); the rest countdown is drawn by iOS from an absolute end
/// time, so it keeps ticking while the app is in the background.
/// One number of the next set the lifter can nudge from the lock screen: weight, reps, seconds,
/// minutes or speed, depending on the kind of exercise. `u` is the unit shown beside it.
struct BeastField: Codable, Hashable {
    var k: String
    var v: Double
    var step: Double
    var u: String
}

@available(iOS 16.2, *)
struct BeastActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String          // exercise of the next set
        var detail: String         // "Set 3/4 · 60 kg × 8"
        var restLabel: String
        var readyLabel: String
        var doneLabel: String      // text of the lock-screen button
        var hasQueue: Bool         // a next set the buttons can adjust and tick
        var setLabel: String       // "Set 3/4" (and the side, for a per-side set)
        var fields: [BeastField]   // what the buttons adjust; empty without a queue
        var restState: String      // "none" | "running" | "paused" | "ready"
        var restStartedAt: Date
        var restEndsAt: Date
        var pausedLeft: Int        // seconds, only while paused
    }

    var workoutName: String
}
