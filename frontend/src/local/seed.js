// Static catalog seeded into the local DB on first launch — ported from the old
// backend's database.seed_db(). Muscle groups + exercises with primary/secondary
// muscle targets. This is read-mostly reference data.

export const MUSCLE_GROUPS = [
  'chest', 'lats', 'traps', 'quads', 'hamstrings', 'front delt', 'side delt',
  'rear delt', 'biceps', 'triceps', 'glutes', 'calves', 'abs', 'adductor', 'abductor',
]

// primary / secondary reference muscle names by exercise.
export const EXERCISES = [
  { name: 'Barbell bench press',    movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['chest'],      secondary: ['triceps', 'front delt'] },
  { name: 'Incline dumbbell press', movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['chest'],      secondary: ['triceps', 'front delt'] },
  { name: 'Cable fly',              movement_pattern: 'push',  equipment: 'cable',      is_unilateral: false, primary: ['chest'],      secondary: [] },
  { name: 'Barbell back squat',     movement_pattern: 'squat', equipment: 'barbell',    is_unilateral: false, primary: ['quads'],      secondary: ['glutes', 'hamstrings'] },
  { name: 'Romanian deadlift',      movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['hamstrings'], secondary: ['glutes', 'lats', 'traps'] },
  { name: 'Pull up',                movement_pattern: 'pull',  equipment: 'bodyweight', is_unilateral: false, primary: ['lats'],       secondary: ['biceps', 'rear delt'] },
  { name: 'Barbell row',            movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['lats', 'traps'], secondary: ['biceps', 'rear delt'] },
  { name: 'Overhead press',         movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['front delt'], secondary: ['triceps', 'side delt'] },
  { name: 'Dumbbell lateral raise', movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['side delt'],  secondary: [] },
  { name: 'Barbell curl',           movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['biceps'],     secondary: [] },
  { name: 'Dumbbell curl',          movement_pattern: 'pull',  equipment: 'dumbbell',   is_unilateral: true,  primary: ['biceps'],     secondary: [] },
  { name: 'Tricep pushdown',        movement_pattern: 'push',  equipment: 'cable',      is_unilateral: false, primary: ['triceps'],    secondary: [] },
  { name: 'Bulgarian split squat',  movement_pattern: 'squat', equipment: 'dumbbell',   is_unilateral: true,  primary: ['quads'],      secondary: ['glutes'] },
  { name: 'Hip thrust',             movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['glutes'],     secondary: ['hamstrings'] },
  { name: 'Leg curl',               movement_pattern: 'hinge', equipment: 'machine',    is_unilateral: false, primary: ['hamstrings'], secondary: [] },
  { name: 'Calf raise',             movement_pattern: 'carry', equipment: 'machine',    is_unilateral: false, primary: ['calves'],     secondary: [] },
]
