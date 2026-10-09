#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Bridges the Swift LiveActivityPlugin into Capacitor's Objective-C plugin registry.
CAP_PLUGIN(LiveActivityPlugin, "LiveActivity",
           CAP_PLUGIN_METHOD(sync, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(end, CAPPluginReturnPromise);
)
