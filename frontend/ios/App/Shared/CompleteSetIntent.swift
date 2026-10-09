import AppIntents

/// The lock-screen / Dynamic Island button. A LiveActivityIntent runs in the app's process, so it
/// can reach BeastLiveStore (UserDefaults) and update the activity without opening the app and
/// without the web side being alive. Compiled into both the app and the widget extension — the
/// extension needs the type to draw the button, the app is what runs it.
@available(iOS 17.0, *)
struct CompleteSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Complete set"
    static var openAppWhenRun: Bool = false
    // Ticking a set must work from the lock screen without unlocking the phone first.
    static var authenticationPolicy: IntentAuthenticationPolicy { .alwaysAllowed }

    func perform() async throws -> some IntentResult {
        await BeastLiveStore.completeNext()
        return .result()
    }
}

/// The − and + buttons under the next set: nudge one of its numbers (weight and reps, seconds,
/// minutes and speed, depending on the exercise) before ticking it. `slot` is which number,
/// `direction` is -1 or +1. Same process and storage as CompleteSetIntent.
@available(iOS 17.0, *)
struct AdjustSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Adjust set"
    static var openAppWhenRun: Bool = false
    static var authenticationPolicy: IntentAuthenticationPolicy { .alwaysAllowed }

    @Parameter(title: "Number")
    var slot: Int

    @Parameter(title: "Direction")
    var direction: Int

    init() {}
    init(slot: Int, direction: Int) {
        self.slot = slot
        self.direction = direction
    }

    func perform() async throws -> some IntentResult {
        await BeastLiveStore.adjust(slot: slot, direction: direction)
        return .result()
    }
}
