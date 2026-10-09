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
