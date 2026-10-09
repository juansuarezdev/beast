import UIKit
import Capacitor

/**
 * Capacitor only auto-registers plugins that come from npm packages (the packageClassList in
 * capacitor.config.json). A plugin that lives in this app target has to be registered by hand
 * once the bridge is up, or the JS side never finds it.
 */
class BeastViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
