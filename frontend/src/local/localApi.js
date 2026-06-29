// Local "backend": the same routes the FastAPI server exposed, implemented against
// the on-device Dexie store. api/index.js dispatches here instead of calling fetch,
// so every page keeps calling get()/post()/etc. with the same paths.

import { db, uuid, ensureSeeded } from './db.js'
import {
  e1rm, bestE1rm, doubleProgressionCue, detectPlateau,
  computeSuggestion, pyWeekday, todayLocal,
} from './analytics.js'

// Thrown for not-found / bad-request so api/index.js can surface it like an HTTP error.
class LocalError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

// ── hydration helpers ────────────────────────────────────────────────────────

async function muscleGroupMap() {
  const all = await db.muscleGroups.toArray()
  return Object.fromEntries(all.map(m => [m.id, { id: m.id, name: m.name }]))
}

async function hydrateExercises(exs) {
  if (!exs.length) return []
  const mgMap = await muscleGroupMap()
  const ids = exs.map(e => e.id)
  const ems = await db.exerciseMuscles.where('exercise_id').anyOf(ids).toArray()
  const byEx = {}
  for (const em of ems) (byEx[em.exercise_id] ||= []).push(em)
  return exs.map(ex => ({
    id: ex.id,
    name: ex.name,
    movement_pattern: ex.movement_pattern,
    equipment: ex.equipment,
    is_unilateral: ex.is_unilateral,
    muscle_targets: (byEx[ex.id] || []).map(em => ({
      muscle_group: mgMap[em.muscle_group_id],
      is_primary: em.is_primary,
    })),
  }))
}

async function hydrateExercise(id) {
  const ex = await db.exercises.get(id)
  if (!ex) throw new LocalError('Exercise not found', 404)
  return (await hydrateExercises([ex]))[0]
}

const setOut = (s) => ({
  id: s.id, set_number: s.set_number, weight_kg: s.weight_kg, side: s.side,
  reps: s.reps, rir: s.rir, is_warmup: s.is_warmup, notes: s.notes,
})

async function setsFor(seId) {
  const sets = await db.setLogs.where('session_exercise_id').equals(seId).toArray()
  sets.sort((a, b) => a.set_number - b.set_number)
  return sets
}

async function hydrateSessionExercise(se) {
  const sets = await setsFor(se.id)
  return {
    id: se.id,
    exercise: await hydrateExercise(se.exercise_id),
    order_index: se.order_index,
    notes: se.notes,
    target_sets: se.target_sets,
    target_reps_min: se.target_reps_min,
    target_reps_max: se.target_reps_max,
    sets: sets.map(setOut),
  }
}

async function hydrateSessionDetail(s) {
  const ses = await db.sessionExercises.where('session_id').equals(s.id).toArray()
  ses.sort((a, b) => a.order_index - b.order_index)
  const session_exercises = []
  for (const se of ses) session_exercises.push(await hydrateSessionExercise(se))
  return { id: s.id, date: s.date, session_rpe: s.session_rpe, notes: s.notes, session_exercises }
}

async function hydrateProgram(p) {
  const days = await db.programDays.where('program_id').equals(p.id).toArray()
  days.sort((a, b) => a.day_of_week - b.day_of_week)
  const outDays = []
  for (const d of days) {
    const pes = await db.programExercises.where('program_day_id').equals(d.id).toArray()
    pes.sort((a, b) => a.order_index - b.order_index)
    const exercises = []
    for (const pe of pes) {
      exercises.push({
        id: pe.id,
        exercise: await hydrateExercise(pe.exercise_id),
        order_index: pe.order_index,
        target_sets: pe.target_sets,
        target_reps_min: pe.target_reps_min,
        target_reps_max: pe.target_reps_max,
      })
    }
    outDays.push({ id: d.id, day_of_week: d.day_of_week, is_rest: d.is_rest, label: d.label, exercises })
  }
  return { id: p.id, name: p.name, is_active: p.is_active, days: outDays }
}

// ── date helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

// ── handlers ─────────────────────────────────────────────────────────────────

const localUser = { id: 'local', name: 'Me', username: 'me', is_admin: false, created_at: new Date().toISOString() }

const handlers = {
  // auth — no-ops in local mode (single user, no accounts)
  authToken: async () => ({ access_token: 'local', token_type: 'bearer', user: localUser }),
  ok: async () => ({ detail: 'ok' }),

  // bodyweight
  listBodyweight: async () => {
    const logs = await db.bodyweightLogs.toArray()
    logs.sort((a, b) => a.date.localeCompare(b.date))
    return logs.map(l => ({ id: l.id, weight_kg: l.weight_kg, date: l.date }))
  },
  addBodyweight: async (body) => {
    const row = { id: uuid(), weight_kg: body.weight_kg, date: body.date }
    await db.bodyweightLogs.add(row)
    return row
  },

  // programs
  listPrograms: async () => {
    const ps = await db.programs.toArray()
    ps.sort((a, b) => a.name.localeCompare(b.name))
    const out = []
    for (const p of ps) out.push(await hydrateProgram(p))
    return out
  },
  todaysPlan: async () => {
    const active = (await db.programs.toArray()).find(p => p.is_active)
    if (!active) throw new LocalError('No active program found', 404)
    const dow = pyWeekday(todayLocal())
    const day = (await db.programDays.where('program_id').equals(active.id).toArray()).find(d => d.day_of_week === dow)
    if (!day) throw new LocalError('No plan found for today', 404)
    const full = await hydrateProgram(active)
    return full.days.find(d => d.id === day.id)
  },
  createProgram: async (body) => {
    const isActive = (await db.programs.count()) === 0
    const pid = uuid()
    await db.programs.add({ id: pid, name: body.name, is_active: isActive })
    await writeProgramDays(pid, body.days || [])
    return hydrateProgram(await db.programs.get(pid))
  },
  updateProgram: async (pid, body) => {
    const program = await db.programs.get(pid)
    if (!program) throw new LocalError('Program not found', 404)
    program.name = body.name
    await db.programs.put(program)
    await deleteProgramDays(pid)
    await writeProgramDays(pid, body.days || [])
    return hydrateProgram(await db.programs.get(pid))
  },
  activateProgram: async (pid) => {
    const target = await db.programs.get(pid)
    if (!target) throw new LocalError('Program not found', 404)
    for (const p of await db.programs.toArray()) {
      if (p.is_active !== (p.id === pid)) { p.is_active = p.id === pid; await db.programs.put(p) }
    }
    return { detail: 'Activated' }
  },
  deleteProgram: async (pid) => {
    if (!(await db.programs.get(pid))) throw new LocalError('Program not found', 404)
    await deleteProgramDays(pid)
    await db.programs.delete(pid)
    return { detail: 'Deleted' }
  },

  // exercises
  listMuscleGroups: async () => {
    const mgs = await db.muscleGroups.toArray()
    mgs.sort((a, b) => a.name.localeCompare(b.name))
    return mgs.map(m => ({ id: m.id, name: m.name }))
  },
  listExercises: async () => {
    const exs = await db.exercises.toArray()
    exs.sort((a, b) => a.name.localeCompare(b.name))
    return hydrateExercises(exs)
  },
  getExercise: async (id) => hydrateExercise(id),
  createExercise: async (body) => {
    const exId = uuid()
    await db.exercises.add({
      id: exId, name: body.name, movement_pattern: body.movement_pattern,
      equipment: body.equipment, is_unilateral: body.is_unilateral,
    })
    for (const m of body.muscles || []) {
      await db.exerciseMuscles.add({ id: uuid(), exercise_id: exId, muscle_group_id: m.muscle_group_id, is_primary: m.is_primary })
    }
    return hydrateExercise(exId)
  },
  deleteExercise: async (id) => {
    if (!(await db.exercises.get(id))) throw new LocalError('Exercise not found', 404)
    const usedInProgram = await db.programExercises.where('exercise_id').equals(id).count()
    const usedInSession = await db.sessionExercises.where('exercise_id').equals(id).count()
    if (usedInProgram || usedInSession) {
      throw new LocalError('Cannot delete this exercise because it is used in a program or session.', 400)
    }
    await db.exerciseMuscles.where('exercise_id').equals(id).delete()
    await db.exercises.delete(id)
    return { detail: 'Deleted' }
  },

  // sessions
  listSessions: async () => {
    const ss = await db.sessions.toArray()
    ss.sort((a, b) => b.date.localeCompare(a.date))
    return ss.map(s => ({ id: s.id, date: s.date, session_rpe: s.session_rpe, notes: s.notes }))
  },
  createSession: async (body) => {
    const row = { id: uuid(), date: body.date, session_rpe: body.session_rpe ?? null, notes: body.notes ?? null }
    await db.sessions.add(row)
    return row
  },
  sessionsByDate: async (date) => {
    const ss = (await db.sessions.where('date').equals(date).toArray())
    const out = []
    for (const s of ss) out.push(await hydrateSessionDetail(s))
    return out
  },
  sessionDetail: async (sid) => {
    const s = await db.sessions.get(sid)
    if (!s) throw new LocalError('Session not found', 404)
    return hydrateSessionDetail(s)
  },
  updateSession: async (sid, body) => {
    const s = await db.sessions.get(sid)
    if (!s) throw new LocalError('Session not found', 404)
    s.session_rpe = body.session_rpe ?? null
    s.notes = body.notes ?? null
    await db.sessions.put(s)
    return { id: s.id, date: s.date, session_rpe: s.session_rpe, notes: s.notes }
  },
  addSessionExercise: async (sid, body) => {
    if (!(await db.sessions.get(sid))) throw new LocalError('Session not found', 404)
    const se = {
      id: uuid(), session_id: sid, exercise_id: body.exercise_id, order_index: body.order_index,
      notes: body.notes ?? null, target_sets: body.target_sets ?? null,
      target_reps_min: body.target_reps_min ?? null, target_reps_max: body.target_reps_max ?? null,
    }
    await db.sessionExercises.add(se)
    return hydrateSessionExercise(se)
  },
  logSet: async (seId, body) => {
    if (!(await db.sessionExercises.get(seId))) throw new LocalError('Session exercise not found', 404)
    const row = {
      id: uuid(), session_exercise_id: seId, set_number: body.set_number,
      weight_kg: body.weight_kg ?? null, side: body.side ?? 'both',
      reps: body.reps, rir: body.rir, is_warmup: body.is_warmup ?? false, notes: body.notes ?? null,
    }
    await db.setLogs.add(row)
    return setOut(row)
  },
  deleteSet: async (setId) => {
    if (!(await db.setLogs.get(setId))) throw new LocalError('Set not found', 404)
    await db.setLogs.delete(setId)
    return { detail: 'Deleted' }
  },
  suggestion: async (exId) => {
    const exercise = await db.exercises.get(exId)
    if (!exercise) throw new LocalError('Exercise not found', 404)

    const ses = await db.sessionExercises.where('exercise_id').equals(exId).toArray()
    // attach session dates, find the most recent
    const withDates = []
    for (const se of ses) {
      const s = await db.sessions.get(se.session_id)
      if (s) withDates.push({ se, date: s.date })
    }
    withDates.sort((a, b) => b.date.localeCompare(a.date))
    const last = withDates[0]

    if (!last) {
      return {
        exercise_id: exId, exercise_name: exercise.name,
        suggested_weight: null, suggested_weight_left: null, suggested_weight_right: null,
        reason: 'No history found for this exercise', pr: null, last_session: null, double_progression: null,
      }
    }

    const lastSets = await setsFor(last.se.id)
    // PR across every set ever logged for this exercise (non-warmup)
    let best = null
    for (const { se, date } of withDates) {
      for (const s of await setsFor(se.id)) {
        if (s.is_warmup) continue
        const w = s.weight_kg || 0
        if (!best || w > best.weight_kg || (w === best.weight_kg && s.reps > best.reps)) {
          best = { weight_kg: w, reps: s.reps, date }
        }
      }
    }

    const result = computeSuggestion(exercise, lastSets)
    const dp = doubleProgressionCue(lastSets, last.se.target_reps_max)
    return {
      exercise_id: exId, exercise_name: exercise.name,
      suggested_weight: result.weight, suggested_weight_left: result.weight_left, suggested_weight_right: result.weight_right,
      reason: result.reason, pr: best, last_session: { date: last.date, sets: lastSets.map(setOut) }, double_progression: dp,
    }
  },

  // progress
  exerciseProgress: async (exId) => {
    const exercise = await db.exercises.get(exId)
    if (!exercise) throw new LocalError('Exercise not found', 404)
    const ses = await db.sessionExercises.where('exercise_id').equals(exId).toArray()
    const rows = []
    for (const se of ses) {
      const s = await db.sessions.get(se.session_id)
      if (s) rows.push({ se, date: s.date })
    }
    rows.sort((a, b) => a.date.localeCompare(b.date))

    const setsByDate = new Map()
    for (const { se, date } of rows) {
      const working = (await setsFor(se.id)).filter(s => !s.is_warmup)
      if (!working.length) continue
      if (!setsByDate.has(date)) setsByDate.set(date, [])
      setsByDate.get(date).push(...working)
    }

    const series = []
    let bestOverall = null
    let pr = null
    for (const [date, sets] of setsByDate) {
      const dayE1rm = bestE1rm(sets)
      const weights = sets.map(s => s.weight_kg || 0)
      const topWeight = weights.length ? Math.max(...weights) : null
      const totalVolume = Math.round(sets.reduce((a, s) => a + (s.weight_kg || 0) * s.reps, 0) * 10) / 10
      series.push({ date, e1rm: dayE1rm, top_weight: topWeight, total_volume: totalVolume })
      if (dayE1rm != null && (bestOverall == null || dayE1rm > bestOverall)) bestOverall = dayE1rm
      for (const s of sets) {
        const w = s.weight_kg || 0
        if (!pr || w > pr.weight_kg || (w === pr.weight_kg && s.reps > pr.reps)) pr = { weight_kg: w, reps: s.reps, date }
      }
    }
    const plateau = detectPlateau(series.map(p => [p.date, p.e1rm]))
    return { exercise_id: exId, exercise_name: exercise.name, series, pr, best_e1rm: bestOverall, plateau }
  },

  // volume
  volume: async (period) => {
    let sessions = await db.sessions.toArray()
    if (period === 'week') {
      const cutoff = addDays(todayLocal(), -7)
      sessions = sessions.filter(s => s.date >= cutoff)
    }
    const mgMap = await muscleGroupMap()
    const counts = {}
    let total = 0
    for (const session of sessions) {
      const ses = await db.sessionExercises.where('session_id').equals(session.id).toArray()
      for (const se of ses) {
        const sets = await setsFor(se.id)
        const working = sets.filter(s => !s.is_warmup)
        const n = new Set(working.map(s => s.set_number)).size
        if (n === 0) continue
        const ems = await db.exerciseMuscles.where('exercise_id').equals(se.exercise_id).toArray()
        for (const em of ems) {
          if (!em.is_primary) continue
          const name = mgMap[em.muscle_group_id]?.name
          counts[name] = (counts[name] || 0) + n
          total += n
        }
      }
    }
    const muscles = Object.entries(counts).map(([muscle, sets]) => ({ muscle, sets }))
    muscles.sort((a, b) => b.sets - a.sets)
    return { period, total_sets: total, muscles }
  },

  // missed sessions
  missedScan: async () => {
    const active = (await db.programs.toArray()).find(p => p.is_active)
    if (!active) return missedPending()
    const days = await db.programDays.where('program_id').equals(active.id).toArray()
    const trainingWeekdays = new Set(days.filter(d => !d.is_rest).map(d => d.day_of_week))
    if (!trainingWeekdays.size) return missedPending()

    const sessions = await db.sessions.toArray()
    if (!sessions.length) return missedPending()
    sessions.sort((a, b) => b.date.localeCompare(a.date))
    const lastDate = sessions[0].date

    let start = addDays(lastDate, 1)
    const end = addDays(todayLocal(), -1) // today isn't missed yet
    const span = Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000)
    if (span > 30) start = addDays(end, -30)
    if (start > end) return missedPending()

    const logged = new Set(sessions.map(s => s.date))
    const already = new Set((await db.missedSessions.toArray()).map(m => m.date))

    let d = start
    while (d <= end) {
      if (trainingWeekdays.has(pyWeekday(d)) && !logged.has(d) && !already.has(d)) {
        await db.missedSessions.add({ id: uuid(), date: d, reason: null, created_at: new Date().toISOString() })
      }
      d = addDays(d, 1)
    }
    return missedPending()
  },
  missedAnswer: async (body) => {
    const pending = (await db.missedSessions.toArray()).filter(m => m.reason == null)
    for (const m of pending) { m.reason = body.reason; await db.missedSessions.put(m) }
    const all = await db.missedSessions.toArray()
    all.sort((a, b) => b.date.localeCompare(a.date))
    return all.map(m => ({ id: m.id, date: m.date, reason: m.reason }))
  },
  listMissed: async () => {
    const all = await db.missedSessions.toArray()
    all.sort((a, b) => b.date.localeCompare(a.date))
    return all.map(m => ({ id: m.id, date: m.date, reason: m.reason }))
  },
}

async function missedPending() {
  const pending = (await db.missedSessions.toArray()).filter(m => m.reason == null)
  pending.sort((a, b) => a.date.localeCompare(b.date))
  return pending.map(m => ({ id: m.id, date: m.date, reason: m.reason }))
}

async function writeProgramDays(pid, days) {
  for (const din of days) {
    const dayId = uuid()
    await db.programDays.add({
      id: dayId, program_id: pid, day_of_week: din.day_of_week,
      is_rest: din.is_rest ?? false, label: din.label ?? null,
    })
    for (const exin of din.exercises || []) {
      await db.programExercises.add({
        id: uuid(), program_day_id: dayId, exercise_id: exin.exercise_id, order_index: exin.order_index,
        target_sets: exin.target_sets ?? null, target_reps_min: exin.target_reps_min ?? null, target_reps_max: exin.target_reps_max ?? null,
      })
    }
  }
}

async function deleteProgramDays(pid) {
  const days = await db.programDays.where('program_id').equals(pid).toArray()
  for (const d of days) await db.programExercises.where('program_day_id').equals(d.id).delete()
  await db.programDays.where('program_id').equals(pid).delete()
}

// ── route table (first match wins; specific routes before generic) ─────────────

const routes = [
  ['POST', /^\/auth\/(login|register)$/, () => handlers.authToken()],
  ['POST', /^\/auth\/change-password$/, () => handlers.authToken()],
  ['POST', /^\/auth\/logout-all$/, () => handlers.ok()],

  ['GET', /^\/users\/[^/]+\/bodyweight$/, () => handlers.listBodyweight()],
  ['POST', /^\/users\/[^/]+\/bodyweight$/, (m, body) => handlers.addBodyweight(body)],

  ['GET', /^\/programs\/[^/]+\/today$/, () => handlers.todaysPlan()],
  ['PATCH', /^\/programs\/[^/]+\/activate\/([^/]+)$/, (m) => handlers.activateProgram(m[1])],
  ['PUT', /^\/programs\/[^/]+\/([^/]+)$/, (m, body) => handlers.updateProgram(m[1], body)],
  ['GET', /^\/programs\/[^/]+$/, () => handlers.listPrograms()],
  ['POST', /^\/programs\/[^/]+$/, (m, body) => handlers.createProgram(body)],
  ['DELETE', /^\/programs\/([^/]+)$/, (m) => handlers.deleteProgram(m[1])],

  ['GET', /^\/exercises\/muscle-groups$/, () => handlers.listMuscleGroups()],
  ['GET', /^\/exercises\/?$/, () => handlers.listExercises()],
  ['POST', /^\/exercises\/?$/, (m, body) => handlers.createExercise(body)],
  ['DELETE', /^\/exercises\/([^/]+)$/, (m) => handlers.deleteExercise(m[1])],
  ['GET', /^\/exercises\/([^/]+)$/, (m) => handlers.getExercise(m[1])],

  ['GET', /^\/sessions\/detail\/([^/]+)$/, (m) => handlers.sessionDetail(m[1])],
  ['PATCH', /^\/sessions\/detail\/([^/]+)$/, (m, body) => handlers.updateSession(m[1], body)],
  ['POST', /^\/sessions\/detail\/([^/]+)\/exercises$/, (m, body) => handlers.addSessionExercise(m[1], body)],
  ['POST', /^\/sessions\/exercises\/([^/]+)\/sets$/, (m, body) => handlers.logSet(m[1], body)],
  ['DELETE', /^\/sessions\/sets\/([^/]+)$/, (m) => handlers.deleteSet(m[1])],
  ['GET', /^\/sessions\/[^/]+\/by-date$/, (m, body, query) => handlers.sessionsByDate(query.date)],
  ['GET', /^\/sessions\/[^/]+\/suggestions\/([^/]+)$/, (m) => handlers.suggestion(m[1])],
  ['POST', /^\/sessions\/[^/]+$/, (m, body) => handlers.createSession(body)],
  ['GET', /^\/sessions\/[^/]+$/, () => handlers.listSessions()],

  ['GET', /^\/progress\/[^/]+\/exercise\/([^/]+)$/, (m) => handlers.exerciseProgress(m[1])],
  ['GET', /^\/volume\/[^/]+$/, (m, body, query) => handlers.volume(query.period || 'week')],

  ['POST', /^\/missed\/[^/]+\/scan$/, () => handlers.missedScan()],
  ['POST', /^\/missed\/[^/]+\/answer$/, (m, body) => handlers.missedAnswer(body)],
  ['GET', /^\/missed\/[^/]+$/, () => handlers.listMissed()],
]

let seededOnce = null

export async function dispatch(method, rawPath, body) {
  if (!seededOnce) seededOnce = ensureSeeded()
  await seededOnce

  const [path, qs] = rawPath.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs || ''))
  for (const [m, re, handler] of routes) {
    if (m !== method) continue
    const match = path.match(re)
    if (match) return handler(match, body, query)
  }
  throw new LocalError(`No local route for ${method} ${path}`, 404)
}
