import Foundation
import Capacitor
import ActivityKit

/**
 * Local Capacitor plugin that keeps one Live Activity in step with the running workout.
 * Usage from JS (lib/live-activity-sync.js):
 *   const Live = registerPlugin('LiveActivity');
 *   await Live.sync({ workoutName, title, detail, restLabel, readyLabel, doneLabel, finishLabel,
 *                     sessionId, queue: [{ e, s, title, detail, rest }],
 *                     restState, restStartedAt, restEndsAt, pausedLeft });   // times: epoch ms
 *   await Live.drain();   // -> { sessionId, actions: [{ e, s, at, rest }] } ticked on the lock screen
 *   await Live.end();
 * Fires a 'pending' event when the lock-screen button ticked a set while the app was alive.
 */
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin {

    override public func load() {
        NotificationCenter.default.addObserver(forName: .beastLiveActionsPending, object: nil, queue: .main) { [weak self] _ in
            self?.notifyListeners("pending", data: [:])
        }
    }

    @objc func drain(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else { call.resolve(["sessionId": "", "actions": []]); return }
        let result = BeastLiveStore.drain()
        call.resolve([
            "sessionId": result.sessionId,
            "actions": result.actions.map { ["e": $0.e, "s": $0.s, "at": $0.at, "rest": $0.rest] },
        ])
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["running": false]); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(["running": false]); return }

        let date = { (key: String) -> Date in Date(timeIntervalSince1970: (call.getDouble(key) ?? 0) / 1000) }
        var state = BeastActivityAttributes.ContentState(
            title: call.getString("title") ?? "",
            detail: call.getString("detail") ?? "",
            restLabel: call.getString("restLabel") ?? "",
            readyLabel: call.getString("readyLabel") ?? "",
            doneLabel: call.getString("doneLabel") ?? "",
            hasQueue: false,
            restState: call.getString("restState") ?? "none",
            restStartedAt: date("restStartedAt"),
            restEndsAt: date("restEndsAt"),
            pausedLeft: call.getInt("pausedLeft") ?? 0
        )
        let workoutName = call.getString("workoutName") ?? ""
        // The button's queue, kept where the button's intent can reach it with the app asleep.
        if #available(iOS 17.0, *) {
            let items: [BeastLiveStore.Item] = (call.getArray("queue") ?? []).compactMap { raw in
                guard let d = raw as? [String: Any],
                      let e = d["e"] as? Int, let s = d["s"] as? Int,
                      let title = d["title"] as? String, let detail = d["detail"] as? String
                else { return nil }
                return BeastLiveStore.Item(e: e, s: s, title: title, detail: detail, rest: (d["rest"] as? Int) ?? 0)
            }
            BeastLiveStore.replace(
                meta: BeastLiveStore.Meta(
                    sessionId: call.getString("sessionId") ?? "",
                    workoutName: workoutName,
                    finishLabel: call.getString("finishLabel") ?? ""
                ),
                queue: items
            )
            state.hasQueue = !items.isEmpty
        }
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
            if #available(iOS 17.0, *) { BeastLiveStore.clear() }
            call.resolve()
        }
    }
}
