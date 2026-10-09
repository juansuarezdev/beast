import ActivityKit
import Foundation

extension Notification.Name {
    /// Posted in the app process when the lock-screen button ticked a set; the plugin forwards it
    /// to the web side, if that is alive, so it can take the tick back straight away.
    static let beastLiveActionsPending = Notification.Name("BeastLiveActionsPending")
}

/// What the lock-screen button needs to tick a set with the app asleep or closed: the sets still
/// to tick, in order, and the ticks already made but not yet taken back by the web side. The web
/// side owns the workout; it writes the queue here on every push and drains the ticks when it is
/// alive again. Plain UserDefaults is enough because the button's intent runs in the app's own
/// process (it is a LiveActivityIntent), not in the widget extension.
@available(iOS 17.0, *)
enum BeastLiveStore {
    struct Item: Codable {
        var e: Int
        var s: Int
        var title: String
        var detail: String
        var rest: Int
    }
    struct Done: Codable {
        var e: Int
        var s: Int
        var at: Double   // epoch ms
        var rest: Int
    }
    struct Meta: Codable {
        var sessionId: String
        var workoutName: String
        var finishLabel: String
    }

    private static let defaults = UserDefaults.standard
    private static let queueKey = "beast.live.queue"
    private static let pendingKey = "beast.live.pending"
    private static let metaKey = "beast.live.meta"

    private static func read<T: Decodable>(_ key: String, as type: T.Type) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
    private static func write<T: Encodable>(_ value: T?, _ key: String) {
        guard let value = value, let data = try? JSONEncoder().encode(value) else { defaults.removeObject(forKey: key); return }
        defaults.set(data, forKey: key)
    }

    static var queue: [Item] {
        get { read(queueKey, as: [Item].self) ?? [] }
        set { write(newValue, queueKey) }
    }
    static var pending: [Done] {
        get { read(pendingKey, as: [Done].self) ?? [] }
        set { write(newValue, pendingKey) }
    }
    static var meta: Meta? {
        get { read(metaKey, as: Meta.self) }
        set { write(newValue, metaKey) }
    }

    /// The web side's view of the session, as of its latest push.
    static func replace(meta: Meta, queue: [Item]) {
        self.meta = meta
        self.queue = queue
    }

    /// Ticks made on the lock screen, handed over once.
    static func drain() -> (sessionId: String, actions: [Done]) {
        let actions = pending
        pending = []
        return (meta?.sessionId ?? "", actions)
    }

    static func clear() {
        meta = nil
        queue = []
        pending = []
    }

    /// The button: tick the next set, start the rest it earns, and show the set after it.
    static func completeNext() async {
        var rest = queue
        guard !rest.isEmpty, let meta = meta else { return }
        let item = rest.removeFirst()
        queue = rest
        let now = Date()
        pending = pending + [Done(e: item.e, s: item.s, at: now.timeIntervalSince1970 * 1000, rest: item.rest)]

        if let activity = Activity<BeastActivityAttributes>.activities.first {
            var state = activity.content.state
            if let next = rest.first {
                state.title = next.title
                state.detail = next.detail
            } else {
                state.title = meta.workoutName
                state.detail = meta.finishLabel
            }
            state.hasQueue = !rest.isEmpty
            var stale: Date? = nil
            if item.rest > 0 {
                state.restState = "running"
                state.restStartedAt = now
                state.restEndsAt = now.addingTimeInterval(Double(item.rest))
                stale = state.restEndsAt
            } else {
                state.restState = "none"
            }
            await activity.update(ActivityContent(state: state, staleDate: stale))
        }
        NotificationCenter.default.post(name: .beastLiveActionsPending, object: nil)
    }
}
