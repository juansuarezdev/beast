// Talks to the native LiveActivity plugin (ios LiveActivityPlugin.m, registered in
// BeastViewController). Everything here is gated on the mobile build and on iOS; the PWA, the web
// build and Android never reach the plugin.
//
// The rest countdown is drawn by iOS from an absolute end time, so it keeps ticking while the
// app is in the background. The next-set text only changes while the app runs, i.e. when a set is
// ticked in the app.

import { MOBILE } from './mobile.js'
import { t } from './i18n.js'
import { EXIDX } from './exercises.js'
import { exerciseNameText } from './format.js'
import { liveActivityState } from './live-activity.js'
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

let started = false
// Called once from the store with how to read it and how to hear about changes. Pushes only when
// what the lock screen would show actually changed, not on every one-second rest tick.
export function initLiveActivitySync(getS, subscribe) {
  if (!MOBILE || started) return
  started = true
  let last
  let chain = Promise.resolve()
  const push = () => {
    const S = getS()
    const state = liveActivityState(S.active, useUI.getState().timer, {
      unit: S.unit === 'lb' ? 'lb' : 'kg',
      nameOf,
      labels: { rest: t('Rest'), ready: t('Ready'), finish: t('Finish workout') },
    })
    const key = JSON.stringify(state)
    if (key === last) return
    last = key
    chain = chain.then(async () => {
      const native = await nativePlugin()
      if (!native) return
      if (state) await native.Live.sync(state)
      else await native.Live.end()
    }).catch(() => {})
  }
  // The store is still being built when this is called, so listening and the first look wait
  // until it exists.
  queueMicrotask(() => {
    subscribe(push)
    useUI.subscribe(push)
    push()
  })
}
