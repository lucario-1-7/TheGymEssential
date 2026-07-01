// Static catalog seeded into the local DB on first launch — ported from the old
// backend's database.seed_db(). Muscle groups + exercises with primary/secondary
// muscle targets. This is read-mostly reference data.

export const MUSCLE_GROUPS = [
  'chest', 'lats', 'traps', 'quads', 'hamstrings', 'front delt', 'side delt',
  'rear delt', 'biceps', 'triceps', 'glutes', 'calves', 'abs', 'adductor', 'abductor',
]

// primary / secondary reference muscle names by exercise. Movement patterns are one
// of: push, pull, hinge, squat, carry (carry doubles as the catch-all for calves and
// core). Only the muscle names in MUSCLE_GROUPS above are valid here.
export const EXERCISES = [
  // Chest
  { name: 'Barbell bench press',        movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['chest'],                 secondary: ['triceps', 'front delt'] },
  { name: 'Incline barbell bench press',movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['chest'],                 secondary: ['front delt', 'triceps'] },
  { name: 'Dumbbell bench press',       movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['chest'],                 secondary: ['triceps', 'front delt'] },
  { name: 'Incline dumbbell press',     movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['chest'],                 secondary: ['triceps', 'front delt'] },
  { name: 'Machine chest press',        movement_pattern: 'push',  equipment: 'machine',    is_unilateral: false, primary: ['chest'],                 secondary: ['triceps', 'front delt'] },
  { name: 'Push up',                    movement_pattern: 'push',  equipment: 'bodyweight', is_unilateral: false, primary: ['chest'],                 secondary: ['triceps', 'front delt'] },
  { name: 'Chest dip',                  movement_pattern: 'push',  equipment: 'bodyweight', is_unilateral: false, primary: ['chest'],                 secondary: ['triceps', 'front delt'] },
  { name: 'Cable fly',                  movement_pattern: 'push',  equipment: 'cable',      is_unilateral: false, primary: ['chest'],                 secondary: [] },
  { name: 'Pec deck fly',               movement_pattern: 'push',  equipment: 'machine',    is_unilateral: false, primary: ['chest'],                 secondary: [] },

  // Back
  { name: 'Pull up',                    movement_pattern: 'pull',  equipment: 'bodyweight', is_unilateral: false, primary: ['lats'],                  secondary: ['biceps', 'rear delt'] },
  { name: 'Chin up',                    movement_pattern: 'pull',  equipment: 'bodyweight', is_unilateral: false, primary: ['lats'],                  secondary: ['biceps'] },
  { name: 'Lat pulldown',               movement_pattern: 'pull',  equipment: 'cable',      is_unilateral: false, primary: ['lats'],                  secondary: ['biceps', 'rear delt'] },
  { name: 'Seated cable row',           movement_pattern: 'pull',  equipment: 'cable',      is_unilateral: false, primary: ['lats'],                  secondary: ['biceps', 'traps', 'rear delt'] },
  { name: 'Barbell row',                movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['lats', 'traps'],         secondary: ['biceps', 'rear delt'] },
  { name: 'One-arm dumbbell row',       movement_pattern: 'pull',  equipment: 'dumbbell',   is_unilateral: true,  primary: ['lats'],                  secondary: ['biceps', 'traps'] },
  { name: 'T-bar row',                  movement_pattern: 'pull',  equipment: 'machine',    is_unilateral: false, primary: ['lats', 'traps'],         secondary: ['biceps', 'rear delt'] },
  { name: 'Face pull',                  movement_pattern: 'pull',  equipment: 'cable',      is_unilateral: false, primary: ['rear delt'],             secondary: ['traps'] },
  { name: 'Barbell shrug',              movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['traps'],                 secondary: [] },
  { name: 'Deadlift',                   movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['hamstrings', 'glutes'],  secondary: ['traps', 'lats', 'quads'] },

  // Shoulders
  { name: 'Overhead press',             movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['front delt'],            secondary: ['triceps', 'side delt'] },
  { name: 'Dumbbell shoulder press',    movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['front delt'],            secondary: ['triceps', 'side delt'] },
  { name: 'Arnold press',               movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['front delt'],            secondary: ['side delt', 'triceps'] },
  { name: 'Dumbbell lateral raise',     movement_pattern: 'push',  equipment: 'dumbbell',   is_unilateral: false, primary: ['side delt'],             secondary: [] },
  { name: 'Cable lateral raise',        movement_pattern: 'push',  equipment: 'cable',      is_unilateral: true,  primary: ['side delt'],             secondary: [] },
  { name: 'Reverse pec deck',           movement_pattern: 'pull',  equipment: 'machine',    is_unilateral: false, primary: ['rear delt'],             secondary: [] },
  { name: 'Upright row',                movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['side delt'],             secondary: ['traps', 'biceps'] },

  // Biceps
  { name: 'Barbell curl',               movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['biceps'],                secondary: [] },
  { name: 'Dumbbell curl',              movement_pattern: 'pull',  equipment: 'dumbbell',   is_unilateral: true,  primary: ['biceps'],                secondary: [] },
  { name: 'Hammer curl',                movement_pattern: 'pull',  equipment: 'dumbbell',   is_unilateral: false, primary: ['biceps'],                secondary: [] },
  { name: 'Preacher curl',              movement_pattern: 'pull',  equipment: 'barbell',    is_unilateral: false, primary: ['biceps'],                secondary: [] },
  { name: 'Cable curl',                 movement_pattern: 'pull',  equipment: 'cable',      is_unilateral: false, primary: ['biceps'],                secondary: [] },

  // Triceps
  { name: 'Tricep pushdown',            movement_pattern: 'push',  equipment: 'cable',      is_unilateral: false, primary: ['triceps'],               secondary: [] },
  { name: 'Overhead tricep extension',  movement_pattern: 'push',  equipment: 'cable',      is_unilateral: false, primary: ['triceps'],               secondary: [] },
  { name: 'Skullcrusher',               movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['triceps'],               secondary: [] },
  { name: 'Close-grip bench press',     movement_pattern: 'push',  equipment: 'barbell',    is_unilateral: false, primary: ['triceps'],               secondary: ['chest', 'front delt'] },
  { name: 'Tricep dip',                 movement_pattern: 'push',  equipment: 'bodyweight', is_unilateral: false, primary: ['triceps'],               secondary: ['chest'] },

  // Quads
  { name: 'Barbell back squat',         movement_pattern: 'squat', equipment: 'barbell',    is_unilateral: false, primary: ['quads'],                 secondary: ['glutes', 'hamstrings'] },
  { name: 'Front squat',                movement_pattern: 'squat', equipment: 'barbell',    is_unilateral: false, primary: ['quads'],                 secondary: ['glutes'] },
  { name: 'Leg press',                  movement_pattern: 'squat', equipment: 'machine',    is_unilateral: false, primary: ['quads'],                 secondary: ['glutes', 'hamstrings'] },
  { name: 'Hack squat',                 movement_pattern: 'squat', equipment: 'machine',    is_unilateral: false, primary: ['quads'],                 secondary: ['glutes'] },
  { name: 'Leg extension',              movement_pattern: 'squat', equipment: 'machine',    is_unilateral: false, primary: ['quads'],                 secondary: [] },
  { name: 'Goblet squat',               movement_pattern: 'squat', equipment: 'dumbbell',   is_unilateral: false, primary: ['quads'],                 secondary: ['glutes'] },
  { name: 'Bulgarian split squat',      movement_pattern: 'squat', equipment: 'dumbbell',   is_unilateral: true,  primary: ['quads'],                 secondary: ['glutes'] },
  { name: 'Walking lunge',              movement_pattern: 'squat', equipment: 'dumbbell',   is_unilateral: true,  primary: ['quads'],                 secondary: ['glutes', 'hamstrings'] },

  // Hamstrings & glutes
  { name: 'Romanian deadlift',          movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['hamstrings'],            secondary: ['glutes', 'lats', 'traps'] },
  { name: 'Sumo deadlift',              movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['glutes', 'hamstrings'],  secondary: ['quads', 'traps'] },
  { name: 'Good morning',               movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['hamstrings'],            secondary: ['glutes'] },
  { name: 'Hip thrust',                 movement_pattern: 'hinge', equipment: 'barbell',    is_unilateral: false, primary: ['glutes'],                secondary: ['hamstrings'] },
  { name: 'Glute bridge',               movement_pattern: 'hinge', equipment: 'bodyweight', is_unilateral: false, primary: ['glutes'],                secondary: ['hamstrings'] },
  { name: 'Cable pull-through',         movement_pattern: 'hinge', equipment: 'cable',      is_unilateral: false, primary: ['glutes'],                secondary: ['hamstrings'] },
  { name: 'Leg curl',                   movement_pattern: 'hinge', equipment: 'machine',    is_unilateral: false, primary: ['hamstrings'],            secondary: [] },
  { name: 'Seated leg curl',            movement_pattern: 'hinge', equipment: 'machine',    is_unilateral: false, primary: ['hamstrings'],            secondary: [] },

  // Calves
  { name: 'Calf raise',                 movement_pattern: 'carry', equipment: 'machine',    is_unilateral: false, primary: ['calves'],                secondary: [] },
  { name: 'Seated calf raise',          movement_pattern: 'carry', equipment: 'machine',    is_unilateral: false, primary: ['calves'],                secondary: [] },

  // Core
  { name: 'Plank',                      movement_pattern: 'carry', equipment: 'bodyweight', is_unilateral: false, primary: ['abs'],                   secondary: [] },
  { name: 'Hanging leg raise',          movement_pattern: 'carry', equipment: 'bodyweight', is_unilateral: false, primary: ['abs'],                   secondary: [] },
  { name: 'Cable crunch',               movement_pattern: 'carry', equipment: 'cable',      is_unilateral: false, primary: ['abs'],                   secondary: [] },
  { name: 'Ab wheel rollout',           movement_pattern: 'carry', equipment: 'bodyweight', is_unilateral: false, primary: ['abs'],                   secondary: [] },

  // Adductor / abductor
  { name: 'Hip adduction',              movement_pattern: 'carry', equipment: 'machine',    is_unilateral: false, primary: ['adductor'],              secondary: [] },
  { name: 'Hip abduction',              movement_pattern: 'carry', equipment: 'machine',    is_unilateral: false, primary: ['abductor'],              secondary: [] },
]
