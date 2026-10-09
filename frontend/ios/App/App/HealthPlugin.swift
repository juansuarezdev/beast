import Foundation
import Capacitor
import HealthKit

/**
 * Minimal local Capacitor plugin that writes a finished session to Apple Health as a
 * strength-training workout, so apps that read Health (Bevel, Fitness, …) count it.
 * Write-only: Beast never reads anything back from Health.
 *
 * Usage from JS (lib/health.js):
 *   const Health = registerPlugin('Health');
 *   await Health.isAvailable();                          // { available: boolean }
 *   await Health.requestAuthorization();                 // iOS permission sheet
 *   await Health.saveWorkout({ start: ms, end: ms });    // epoch milliseconds
 */
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin {
    private let store = HKHealthStore()
    private let workoutType = HKObjectType.workoutType()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device")
            return
        }
        store.requestAuthorization(toShare: [workoutType], read: []) { _, error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard let startMs = call.getDouble("start"), let endMs = call.getDouble("end"), endMs > startMs else {
            call.reject("start and end are required, and end must be after start")
            return
        }
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device")
            return
        }
        guard store.authorizationStatus(for: workoutType) == .sharingAuthorized else {
            call.reject("Not allowed to write workouts to Apple Health")
            return
        }
        let start = Date(timeIntervalSince1970: startMs / 1000)
        let end = Date(timeIntervalSince1970: endMs / 1000)

        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        config.locationType = .indoor

        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
        builder.beginCollection(withStart: start) { _, error in
            if let error = error { call.reject(error.localizedDescription); return }
            builder.endCollection(withEnd: end) { _, error in
                if let error = error { call.reject(error.localizedDescription); return }
                builder.finishWorkout { workout, error in
                    if let error = error {
                        call.reject(error.localizedDescription)
                    } else {
                        call.resolve(["saved": workout != nil])
                    }
                }
            }
        }
    }
}
