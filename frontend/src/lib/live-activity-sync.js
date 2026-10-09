// Talks to the native LiveActivity plugin (ios LiveActivityPlugin.m, registered in
// BeastViewController). Everything here is gated on the mobile build and on iOS; the PWA, the web
// build and Android never reach the plugin.
//
// The rest countdown is drawn by iOS from an absolute end time, so it keeps ticking while the
// app is in the background. The lock-screen button ticks the next set natively, even with the app
// asleep, and leaves the ticks in a queue; this side takes them back (drain) whenever the app is
// alive — before every push, when it returns to the foreground, and when the plugin says so — and
// applies them to the saved session. The session in the store stays the single source of truth.

import { MOBILE, onAppActive } from './mobile.js'
import { t } from './i18n.js'
import { EXIDX } from './exercises.js'
import { exerciseNameText } from './format.js'
import { completeSetFromLock, liveActivityState } from './live-activity.js'
import { supersetUnits, unitOf } from './history.js'
import { speedUnitOf } from './speed.js'
import { restSecFor, warmupRestSecFor } from './supersetFlow.js'
import { smartRestForSet } from './set-compare.js'
import { useUI } from '../store/useUI.js'

// The plugin goes back inside an object, never bare: a Capacitor plugin answers to every property
// name, `then` included, so an async function returning it directly never settles.
async function nativePlugin() {
  if (!MOBILE) return null
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  if (Capacitor.getPlatform() !== 'ios') return null
  return { Live: registerPlugin('LiveActivity') }
}

const nameOf = id => (EXIDX[id] ? exerciseNameText(EXIDX[id]) : t('Unknown exercise'))

// The rest a set earns, as the workout screen works it out when the set is ticked there.
const restFor = (S, active) => {
  const units = supersetUnits(active.entries)
  return (e, s) => smartRestForSet(S, active.entries[e], active.entries[e].sets[s],
    warmupRestSecFor(active.entries[e], s, restSecFor(active.entries, unitOf(units, e), S.restSec)))
}

let started = false
// Called once from the store with how to read it, change it and hear about changes. Pushes only
// when what the lock screen would show actually changed, not on every one-second rest tick.
export function initLiveActivitySync({ getS, update, subscribe }) {
  if (!MOBILE || started) return
  started = true
  let last
  let chain = Promise.resolve()

  // Ticks made on the lock screen since the app last looked. Applied only to the session they
  // were made in, and only to sets still open (the app may have ticked them itself meanwhile).
  // True when there were any: the lock screen has then moved on by itself, so whatever it shows
  // is sent again from the session even if that looks unchanged to this side.
  const drain = async Live => {
    const { sessionId, actions } = await Live.drain()
    if (!actions || !actions.length) return false
    const active = getS().active
    if (!active || String(active.id) !== sessionId) return true
    let applied = null
    const speedUnit = speedUnitOf(getS())
    update(S => {
      for (const a of actions) if (completeSetFromLock(S, a.e, a.s, { side: a.side, fields: a.fields, speedUnit })) applied = a
    })
    if (!applied) return true
    // The rest it started is already counting on the lock screen; carry on from what is left.
    const left = Math.round((applied.at + applied.rest * 1000 - Date.now()) / 1000)
    if (left > 1) useUI.getState().startRest(left, applied.e)
    return true
  }

  const run = async () => {
    const native = await nativePlugin()
    if (!native) return
    if (await drain(native.Live)) last = undefined
    const S = getS()
    const state = liveActivityState(S.active, useUI.getState().timer, {
      unit: S.unit === 'lb' ? 'lb' : 'kg',
      speedUnit: speedUnitOf(S),
      nameOf,
      restFor: S.active ? restFor(S, S.active) : undefined,
      labels: { rest: t('Rest'), ready: t('Ready'), done: t('Done'), finish: t('Finish workout') },
    })
    const key = JSON.stringify(state)
    if (key === last) return
    last = key
    if (state) await native.Live.sync(state)
    else await native.Live.end()
  }
  const push = () => { chain = chain.then(run).catch(() => {}) }

  // The store is still being built when this is called, so listening and the first look wait
  // until it exists.
  queueMicrotask(async () => {
    subscribe(push)
    useUI.subscribe(push)
    onAppActive(push)
    const native = await nativePlugin().catch(() => null)
    if (native) native.Live.addListener('pending', push)
    push()
  })
}
