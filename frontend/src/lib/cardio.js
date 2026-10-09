// Cardio by sport: a run is logged by distance and shows a pace per km, a swim by metres and a
// pace per 100 m, a row by metres and a split per 500 m, a ride by distance and km/h. The row
// still stores what it always did — minutes and a speed in km/h — plus the distance when one was
// typed, so history, charts, the muscle model and every older reader keep working unchanged.
// Pure: nothing here touches the store or the catalogue.

const round2 = n => Math.round(n * 100) / 100
const KM_PER_MI = 1.609344

// Which sport a cardio exercise is, from its name: the catalogue has no field for it, and a custom
// exercise names itself. null for everything else (jump rope, burpees, ski step …), which keeps
// the minutes-and-speed columns.
export function cardioKindFromName(name) {
  const n = String(name || '').toLowerCase()
  if (/\bswim|\bswimming\b/.test(n)) return 'swim'
  if (/\browing\b|\brower\b|\brow(ing)? machine\b|\berg\b/.test(n) && !/\bupright\b|\bbent\b/.test(n)) return 'row'
  if (/\bcycling\b|\bstationary bike\b|\bspinning\b|\bbike ride\b|\bindoor bike\b/.test(n)) return 'bike'
  if (/^run\b|^running\b|\btreadmill running\b|\bjogging\b|^jog\b/.test(n)) return 'run'
  return null
}

// Metres for a pool or a rowing machine, kilometres (miles on a profile that counts speed in mph)
// for the road.
export const distanceUnit = (kind, speedUnit) => (kind === 'swim' || kind === 'row' ? 'm' : speedUnit === 'mph' ? 'mi' : 'km')
export const distanceStep = (kind, speedUnit) => (kind === 'swim' ? 50 : kind === 'row' ? 100 : speedUnit === 'mph' ? 0.25 : 0.5)

// Between the number on screen (m, km or mi) and the one stored (km).
export const toKm = (value, kind, speedUnit) => {
  const v = Number(value) || 0
  return kind === 'swim' || kind === 'row' ? v / 1000 : speedUnit === 'mph' ? v * KM_PER_MI : v
}
export const fromKm = (km, kind, speedUnit) => {
  const v = Number(km) || 0
  return kind === 'swim' || kind === 'row' ? Math.round(v * 1000) : speedUnit === 'mph' ? round2(v / KM_PER_MI) : round2(v)
}

// The distance of a row: the one typed, else what its minutes at its speed come to (rows made
// before distance existed, or by the speed column of another exercise).
export function distanceKmOf(row) {
  if (row?.dist > 0) return row.dist
  return row?.min > 0 && row?.speed > 0 ? round2((row.min * row.speed) / 60) : 0
}

// Typing the minutes or the distance keeps the speed in step, so the stored speed always agrees
// with the pair the lifter sees; changing the minutes keeps the distance, which is the number a
// run, a swim or a row is remembered by.
export function withMinutes(row, min) {
  // The distance on screen is what stays: the typed one, else what the old minutes and speed came to.
  const dist = distanceKmOf(row)
  const out = { ...row, min }
  if (dist > 0 && min > 0) {
    out.dist = dist
    out.speed = round2(dist / (min / 60))
  }
  return out
}
export function withDistanceKm(row, km) {
  const out = { ...row, dist: km }
  if (km > 0 && row?.min > 0) out.speed = round2(km / (row.min / 60))
  return out
}

const clock = sec => {
  const s = Math.round(sec)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

// The pace a sport is read in: min/km (or min/mi) for a run, km/h (mph) for a ride, a split per
// 500 m for a row, a time per 100 m for a swim. '' without a usable speed.
export function paceText(kind, speed, speedUnit = 'kmh') {
  if (!(speed > 0)) return ''
  if (kind === 'run') return speedUnit === 'mph' ? clock((3600 * KM_PER_MI) / speed) + ' /mi' : clock(3600 / speed) + ' /km'
  if (kind === 'row') return clock(1800 / speed) + ' /500 m'
  if (kind === 'swim') return clock(360 / speed) + ' /100 m'
  if (kind === 'bike') return (speedUnit === 'mph' ? round2(speed / KM_PER_MI) + ' mph' : round2(speed) + ' km/h')
  return ''
}
