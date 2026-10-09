// Loaded carries, sled work and rucking are done for a distance, not for reps: the row still holds
// a weight and a number in `r`, but that number is metres. Everything downstream — volume, personal
// bests, progression, history — keeps reading `w` and `r` unchanged; only the words and the step
// around the number change. An exercise is a distance exercise when its config says so (`repUnit`),
// else when its name says so.

import { EXIDX } from './exercises.js'

const DISTANCE_NAME = /\bcarry\b|\bfarmers? walk\b|\bsled (push|drag)\b|\bruck\b/i

export const DISTANCE_STEP = 5   // metres per tap

export function repUnitOf(cfg) {
  if (cfg?.repUnit === 'm' || cfg?.repUnit === 'reps') return cfg.repUnit
  return DISTANCE_NAME.test(EXIDX[cfg?.id]?.n || '') ? 'm' : 'reps'
}

export const isDistanceLoad = cfg => repUnitOf(cfg) === 'm'

// What the reps number is called on screen for this exercise.
export const repWordOf = (cfg, repsWord) => (isDistanceLoad(cfg) ? 'm' : repsWord)
