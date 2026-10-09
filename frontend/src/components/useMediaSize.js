import { useState } from 'react'
import { useStore } from '../store/useStore.js'

// How big an exercise's animation shows on the workout screen. In the cards layout it is the
// profile's own choice (Settings → Exercise animations, Full / Small / Hidden), and the control on
// the animation changes it for every exercise. In the list layout every exercise has its animation
// on screen at once, so it has a setting of its own (Animations in list view), a small thumbnail
// unless that says otherwise, and the control there flips just this one exercise. Hidden in either
// setting hides it in both — "off" means off.
//
// Returns { off, mini, list, flip }; `flip` is null when the media is not the workout's own.
export function useMediaSize(minimizable) {
  const gifSize = useStore(s => s.S.gifSize)
  const listGifSize = useStore(s => s.S.listGifSize)
  const list = useStore(s => !!minimizable && (s.S.active?.workoutView || s.S.workoutView) === 'list')
  const update = useStore(s => s.update)
  const [flipped, setFlipped] = useState(false)
  if (!minimizable) return { off: false, mini: false, list: false, flip: null }
  if (!list) {
    return {
      off: gifSize === 'off',
      mini: gifSize === 'mini',
      list: false,
      flip: () => update(s => { s.gifSize = gifSize === 'mini' ? 'full' : 'mini' }),
    }
  }
  const base = listGifSize === 'full' || listGifSize === 'off' ? listGifSize : 'mini'
  const baseMini = base === 'mini'
  return {
    off: gifSize === 'off' || base === 'off',
    mini: flipped ? !baseMini : baseMini,
    list: true,
    flip: () => setFlipped(f => !f),
  }
}
