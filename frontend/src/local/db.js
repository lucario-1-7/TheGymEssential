import Dexie from 'dexie'
import { MUSCLE_GROUPS, EXERCISES } from './seed.js'

// On-device store. Runs identically in the browser and inside the Capacitor
// Android WebView (IndexedDB is available in both), so there's no native plugin.
export const db = new Dexie('thegymessential')

db.version(1).stores({
  // Only index the fields we query/sort on; Dexie stores the whole object regardless.
  muscleGroups:     'id, name',
  exercises:        'id, name',
  exerciseMuscles:  'id, exercise_id, muscle_group_id',
  programs:         'id, is_active',
  programDays:      'id, program_id, day_of_week',
  programExercises: 'id, program_day_id, exercise_id, order_index',
  sessions:         'id, date',
  sessionExercises: 'id, session_id, exercise_id, order_index',
  setLogs:          'id, session_exercise_id, set_number',
  bodyweightLogs:   'id, date',
  missedSessions:   'id, date',
})

export const uuid = () => crypto.randomUUID()

// Seed the static catalog once. Idempotent: skips if exercises already exist.
export async function ensureSeeded() {
  const count = await db.exercises.count()
  if (count > 0) return

  const mgByName = {}
  await db.transaction('rw', db.muscleGroups, db.exercises, db.exerciseMuscles, async () => {
    for (const name of MUSCLE_GROUPS) {
      const id = uuid()
      mgByName[name] = id
      await db.muscleGroups.add({ id, name })
    }
    for (const e of EXERCISES) {
      const exId = uuid()
      await db.exercises.add({
        id: exId,
        name: e.name,
        movement_pattern: e.movement_pattern,
        equipment: e.equipment,
        is_unilateral: e.is_unilateral,
      })
      for (const m of e.primary) {
        await db.exerciseMuscles.add({ id: uuid(), exercise_id: exId, muscle_group_id: mgByName[m], is_primary: true })
      }
      for (const m of e.secondary) {
        await db.exerciseMuscles.add({ id: uuid(), exercise_id: exId, muscle_group_id: mgByName[m], is_primary: false })
      }
    }
  })
}

// Wipe all user data (keeps nothing). Used by restore-from-backup before import.
export async function clearAllData() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}

// Dump every table to a plain object — the basis for Drive backup (Phase 3).
export async function exportAll() {
  const out = {}
  for (const t of db.tables) out[t.name] = await t.toArray()
  return { version: 1, exported_at: new Date().toISOString(), tables: out }
}

// Replace all data from an exportAll() dump.
export async function importAll(dump) {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear()
      const rows = dump?.tables?.[t.name]
      if (Array.isArray(rows) && rows.length) await t.bulkAdd(rows)
    }
  })
}
