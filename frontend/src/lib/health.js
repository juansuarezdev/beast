// Apple Health (HealthKit) bridge for the native iOS app. A finished live session is written as a
// strength-training workout, so apps that read Health (Bevel, Fitness, …) count it. Everything
// native is gated on the mobile build and on iOS: the PWA, the web build and Android never
// reach the plugin. The local `Health` plugin is registered natively (ios HealthPlugin.m).

import { MOBILE } from './mobile.js'

// The window a finished workout is written with, or null when there is nothing HealthKit would
// accept (it refuses a workout that ends at or before its start).
export function healthWorkoutWindow(w) {
  const start = w?.start
  const end = w?.end
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return { start, end }
}

async function healthPlugin() {
  if (!MOBILE) return null
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  if (Capacitor.getPlatform() !== 'ios') return null
  return registerPlugin('Health')
}

export async function isHealthAvailable() {
  try {
    const Health = await healthPlugin()
    if (!Health) return false
    const { available } = await Health.isAvailable()
    return !!available
  } catch (e) {
    return false
  }
}

// Shows the iOS permission sheet (once; later calls resolve silently). True when the plugin ran.
export async function requestHealthAccess() {
  try {
    const Health = await healthPlugin()
    if (!Health) return false
    await Health.requestAuthorization()
    return true
  } catch (e) {
    return false
  }
}

// Fire-and-forget from the finish path: a Health failure must never block saving the workout.
export async function saveWorkoutToHealth(w) {
  const window = healthWorkoutWindow(w)
  if (!window) return false
  try {
    const Health = await healthPlugin()
    if (!Health) return false
    await Health.saveWorkout(window)
    return true
  } catch (e) {
    return false
  }
}
