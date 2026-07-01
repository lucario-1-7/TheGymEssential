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

// Seed / top up the static catalog. Additive and idempotent: adds any muscle groups
// or exercises (matched by name) that aren't already present, and leaves user data
// and custom entries untouched. Runs on every launch, so new catalog entries reach
// existing installs and survive a restore from an older backup.
export async function ensureSeeded() {
  // Muscle groups: add any missing by name.
  const mgByName = {}
  for (const m of await db.muscleGroups.toArray()) mgByName[m.name] = m.id
  const missingMg = MUSCLE_GROUPS.filter(name => !mgByName[name])
  if (missingMg.length) {
    await db.transaction('rw', db.muscleGroups, async () => {
      for (const name of missingMg) {
        const id = uuid()
        mgByName[name] = id
        await db.muscleGroups.add({ id, name })
      }
    })
  }

  // Exercises: add any missing by name (case-insensitive), with their muscle targets.
  const have = new Set((await db.exercises.toArray()).map(e => e.name.toLowerCase()))
  const toAdd = EXERCISES.filter(e => !have.has(e.name.toLowerCase()))
  if (!toAdd.length) return
  await db.transaction('rw', db.exercises, db.exerciseMuscles, async () => {
    for (const e of toAdd) {
      const exId = uuid()
      await db.exercises.add({
        id: exId,
        name: e.name,
        movement_pattern: e.movement_pattern,
        equipment: e.equipment,
        is_unilateral: e.is_unilateral,
      })
      for (const m of e.primary) {
        if (mgByName[m]) await db.exerciseMuscles.add({ id: uuid(), exercise_id: exId, muscle_group_id: mgByName[m], is_primary: true })
      }
      for (const m of e.secondary) {
        if (mgByName[m]) await db.exerciseMuscles.add({ id: uuid(), exercise_id: exId, muscle_group_id: mgByName[m], is_primary: false })
      }
    }
  })
}

// True if the user has logged anything worth backing up. Ignores the static seed
// (muscleGroups/exercises/exerciseMuscles), which exists on every install. Used to
// stop a just-installed empty DB from overwriting a good cloud backup.
export async function hasUserData() {
  const counts = await Promise.all([
    db.sessions.count(),
    db.programs.count(),
    db.bodyweightLogs.count(),
  ])
  return counts.some(n => n > 0)
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
