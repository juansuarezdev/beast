#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Bridges the Swift HealthPlugin into Capacitor's Objective-C plugin registry.
CAP_PLUGIN(HealthPlugin, "Health",
           CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(saveWorkout, CAPPluginReturnPromise);
)
