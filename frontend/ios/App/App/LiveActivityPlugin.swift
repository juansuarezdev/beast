import Foundation
import Capacitor
import ActivityKit

/**
 * Local Capacitor plugin that keeps one Live Activity in step with the running workout.
 * Usage from JS (lib/live-activity-sync.js):
 *   const Live = registerPlugin('LiveActivity');
 *   await Live.sync({ workoutName, title, detail, restLabel, readyLabel,
 *                     restState, restStartedAt, restEndsAt, pausedLeft });   // times: epoch ms
 *   await Live.end();
 */
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin {

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["running": false]); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(["running": false]); return }

        let date = { (key: String) -> Date in Date(timeIntervalSince1970: (call.getDouble(key) ?? 0) / 1000) }
        let state = BeastActivityAttributes.ContentState(
            title: call.getString("title") ?? "",
            detail: call.getString("detail") ?? "",
            restLabel: call.getString("restLabel") ?? "",
            readyLabel: call.getString("readyLabel") ?? "",
            restState: call.getString("restState") ?? "none",
            restStartedAt: date("restStartedAt"),
            restEndsAt: date("restEndsAt"),
            pausedLeft: call.getInt("pausedLeft") ?? 0
        )
        let workoutName = call.getString("workoutName") ?? ""
        // Once a running rest passes its end the system marks the activity stale, which the
        // widget reads as "ready for the next set" even though the app is asleep.
        let stale: Date? = state.restState == "running" ? state.restEndsAt : nil

        Task {
            let content = ActivityContent(state: state, staleDate: stale)
            do {
                if let current = Activity<BeastActivityAttributes>.activities.first {
                    await current.update(content)
                } else {
                    _ = try Activity.request(
                        attributes: BeastActivityAttributes(workoutName: workoutName),
                        content: content,
                        pushType: nil
                    )
                }
                call.resolve(["running": true])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        Task {
            for activity in Activity<BeastActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
