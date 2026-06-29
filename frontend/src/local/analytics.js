// Pure training-analytics helpers — a faithful JS port of the backend analytics.py
// plus the suggestion engine from sessions.py. No DB access here.

const round2 = (n) => Math.round(n * 100) / 100

// Local calendar date (YYYY-MM-DD), matching how the app stores dates.
export function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}

// Parse a YYYY-MM-DD string at noon to dodge timezone date-rollover.
export function parseDate(d) {
  return new Date(d + 'T12:00:00')
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000)
}

// Epley: weight * (1 + reps/30). null on missing/non-positive inputs.
export function e1rm(weight, reps) {
  if (weight == null || reps == null || weight <= 0 || reps <= 0) return null
  return round2(weight * (1 + reps / 30))
}

export function bestE1rm(sets) {
  let best = null
  for (const s of sets) {
    if (s.is_warmup) continue
    const est = e1rm(s.weight_kg, s.reps)
    if (est != null && (best == null || est > best)) best = est
  }
  return best
}

export function doubleProgressionCue(sets, targetRepsMax) {
  if (!targetRepsMax) return null
  const working = sets.filter(s => !s.is_warmup && s.rir != null)
  if (!working.length) return null

  if (working.some(s => s.reps >= targetRepsMax)) {
    return { level: 'add', message: `Add weight next session!! You hit the top of your rep range(${targetRepsMax}) last time.` }
  }
  if (working.some(s => (s.reps + s.rir) >= targetRepsMax)) {
    return { level: 'try', message: `Try adding weight — you had reps in reserve at the top of your range (${targetRepsMax}) last time.` }
  }
  return null
}

function linregSlope(xs, ys) {
  const n = xs.length
  if (n < 2) return null
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  return num / den
}

// series: array of [dateStr, e1rm|null] sorted ascending by date.
export function detectPlateau(series, { minSessions = 4, windowWeeks = 4, minGainPerWeek = 0.5 } = {}) {
  const pts = series.filter(([, v]) => v != null)
  const insufficient = {
    is_plateaued: false,
    status: 'insufficient_data',
    message: 'Not enough history yet to judge a trend.',
    slope_per_week: null,
    weeks_analyzed: 0.0,
  }
  if (pts.length < minSessions) return insufficient

  const lastDate = pts[pts.length - 1][0]
  let window = pts.filter(([d]) => daysBetween(d, lastDate) <= windowWeeks * 7)
  if (window.length < minSessions) window = pts.slice(-minSessions)

  const spanWeeks = daysBetween(window[0][0], window[window.length - 1][0]) / 7
  if (spanWeeks < 2) return insufficient

  const days = window.map(([d]) => daysBetween(window[0][0], d))
  const vals = window.map(([, v]) => v)
  const slopeDay = linregSlope(days, vals)
  if (slopeDay == null) return insufficient

  const slopePerWeek = round2(slopeDay * 7)
  const isPlateaued = slopePerWeek < minGainPerWeek
  const sign = (n) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1))
  const message = isPlateaued
    ? `e1RM has moved ${sign(slopePerWeek)} kg/week over the last ${round2(spanWeeks).toFixed(1)} weeks — progress has stalled.`
    : `Progressing at ${sign(slopePerWeek)} kg/week.`

  return {
    is_plateaued: isPlateaued,
    status: 'ok',
    message,
    slope_per_week: slopePerWeek,
    weeks_analyzed: round2(spanWeeks),
  }
}

// Weight suggestion from last session's sets — ported from compute_suggestion().
export function computeSuggestion(exercise, lastSets) {
  const increments = { push: 2.5, pull: 2.5, squat: 5.0, hinge: 5.0, carry: 2.5 }
  let step = increments[exercise.movement_pattern] ?? 2.5
  if (exercise.is_unilateral && (exercise.movement_pattern === 'push' || exercise.movement_pattern === 'pull')) {
    step = 1.25
  }

  const working = lastSets.filter(s => s.rir != null && !s.is_warmup)
  if (!working.length) {
    return { reason: 'No sets logged yet', weight: null, weight_left: null, weight_right: null }
  }

  const avgRir = working.reduce((a, s) => a + s.rir, 0) / working.length
  let action, weightChange
  if (avgRir >= 3) { action = 'Add weight — too easy'; weightChange = step }
  else if (avgRir >= 1) { action = 'Same weight, aim for more reps'; weightChange = 0 }
  else { action = 'Consolidate before progressing'; weightChange = 0 }

  const lastSideWeight = (side) => {
    const sideSets = working.filter(s => s.side === side)
    if (!sideSets.length) return null
    return round2((sideSets[sideSets.length - 1].weight_kg || 0) + weightChange)
  }

  if (exercise.is_unilateral) {
    return { reason: action, weight: null, weight_left: lastSideWeight('left'), weight_right: lastSideWeight('right') }
  }
  const lastWeight = working[working.length - 1].weight_kg || 0
  return { reason: action, weight: round2(lastWeight + weightChange), weight_left: null, weight_right: null }
}

// Python's date.weekday(): Mon=0..Sun=6. JS getDay(): Sun=0..Sat=6.
export function pyWeekday(dateStr) {
  return (parseDate(dateStr).getDay() + 6) % 7
}
