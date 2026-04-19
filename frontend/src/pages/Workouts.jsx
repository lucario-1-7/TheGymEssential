import { useEffect, useState } from 'react'
import { get, post, patch, put, del } from '../api/index.js'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const USER_ID = 'd45ce928-b4dc-4d4a-9a7b-8e9450f7138d'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Workouts() {
  const [programs, setPrograms] = useState([])
  const [exercises, setExercises] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)

  useEffect(() => {
    get(`/programs/${USER_ID}`).then(data => setPrograms(Array.isArray(data) ? data : []))
    get('/exercises').then(data => setExercises(Array.isArray(data) ? data : []))
  }, [])

  async function handleActivate(programId) {
    await patch(`/programs/${USER_ID}/activate/${programId}`, {})
    setPrograms(prev => prev.map(p => ({ ...p, is_active: p.id === programId })))
  }

  async function handleDelete(programId) {
    await del(`/programs/${programId}`)
    setPrograms(prev => prev.filter(p => p.id !== programId))
  }

  async function handleSaveProgram(program) {
    if (editingProgram) {
      const updated = await put(`/programs/${USER_ID}/${editingProgram.id}`, program)
      setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p))
    } else {
      const created = await post(`/programs/${USER_ID}`, program)
      setPrograms(prev => [...prev, created])
    }
    setShowCreate(false)
    setEditingProgram(null)
  }

  function handleEditStart(p) {
    setEditingProgram(p)
    setShowCreate(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">My Workouts</h2>
        <Button onClick={() => { setShowCreate(s => !s); setEditingProgram(null); }}>
          {showCreate ? 'Cancel' : 'New program'}
        </Button>
      </div>

      {showCreate && (
        <ProgramBuilder 
          exercises={exercises} 
          initialProgram={editingProgram} 
          onSave={handleSaveProgram} 
          onCancel={() => { setShowCreate(false); setEditingProgram(null); }} 
        />
      )}

      <div className="space-y-3">
        {programs.length === 0 && !showCreate && (
          <p className="text-sm text-gray-500">No programs yet. Create one above.</p>
        )}
        {programs.map(p => (
          <Card key={p.id} className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {p.name}
                  {p.is_active && (
                    <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditStart(p)}>
                    Edit
                  </Button>
                  {!p.is_active && (
                    <Button size="sm" variant="outline" onClick={() => handleActivate(p.id)}>
                      Set active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 hover:text-red-400"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day, i) => {
                  const pd = p.days.find(d => d.day_of_week === i)
                  return (
                    <div key={day} className="text-center">
                      <p className="text-xs text-gray-500 mb-1">{day.slice(0, 3)}</p>
                      <div className={`text-xs rounded p-1 ${!pd || pd.is_rest
                          ? 'bg-gray-800 text-gray-600'
                          : 'bg-gray-700 text-white'
                        }`}>
                        {!pd || pd.is_rest ? 'Rest' : (pd.label || 'Training')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


function ProgramBuilder({ exercises, onSave, initialProgram, onCancel }) {
  const [name, setName] = useState(initialProgram?.name || '')
  const [days, setDays] = useState(() => {
    if (initialProgram) {
      return DAYS.map((_, i) => {
        const pDay = initialProgram.days.find(d => d.day_of_week === i)
        if (pDay) {
          return {
            day_of_week: i,
            is_rest: pDay.is_rest,
            label: pDay.label || '',
            exercises: pDay.exercises.map(ex => ({
              exercise_id: ex.exercise.id,
              exercise_name: ex.exercise.name,
              order_index: ex.order_index,
              target_sets: ex.target_sets || 2,
              target_reps_min: ex.target_reps_min || 4,
              target_reps_max: ex.target_reps_max || 8,
            }))
          }
        }
        return { day_of_week: i, is_rest: true, label: '', exercises: [] }
      })
    }
    return DAYS.map((_, i) => ({ day_of_week: i, is_rest: true, label: '', exercises: [] }))
  })
  const [activeDay, setActiveDay] = useState(0)
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  function toggleRest(dayIndex) {
    setDays(prev => prev.map((d, i) =>
      i === dayIndex ? { ...d, is_rest: !d.is_rest } : d
    ))
  }

  function setLabel(dayIndex, label) {
    setDays(prev => prev.map((d, i) =>
      i === dayIndex ? { ...d, label } : d
    ))
  }

  function addExercise(exercise) {
    setDays(prev => prev.map((d, i) =>
      i === activeDay ? {
        ...d,
        exercises: [...d.exercises, {
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          order_index: d.exercises.length,
          target_sets: 2,
          target_reps_min: 4,
          target_reps_max: 8,
        }]
      } : d
    ))
    setShowExercisePicker(false)
  }

  function updateExerciseField(dayIndex, exIndex, field, value) {
    setDays(prev => prev.map((d, i) =>
      i === dayIndex ? {
        ...d,
        exercises: d.exercises.map((e, j) =>
          j === exIndex ? { ...e, [field]: parseInt(value) || value } : e
        )
      } : d
    ))
  }

  function removeExercise(dayIndex, exIndex) {
    setDays(prev => prev.map((d, i) =>
      i === dayIndex ? {
        ...d,
        exercises: d.exercises.filter((_, j) => j !== exIndex)
      } : d
    ))
  }

  function handleSave() {
    if (!name) return
    onSave({ name, days })
  }

  const currentDay = days[activeDay]

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-base">Create program</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        <Input
          placeholder="Program name e.g. PPL, Upper Lower"
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-gray-800 border-gray-700"
        />

        {/* Day tabs */}
        <div className="flex gap-1 flex-wrap">
          {DAYS.map((day, i) => (
            <button
              key={day}
              onClick={() => setActiveDay(i)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${activeDay === i
                  ? 'bg-white text-gray-900'
                  : days[i].is_rest
                    ? 'bg-gray-800 text-gray-500'
                    : 'bg-gray-700 text-white'
                }`}
            >
              {day.slice(0, 3)}
              {!days[i].is_rest && days[i].exercises.length > 0 && (
                <span className="ml-1 text-gray-400">({days[i].exercises.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Current day editor */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium">{DAYS[activeDay]}</h3>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={currentDay.is_rest}
                onChange={() => toggleRest(activeDay)}
              />
              Rest day
            </label>
          </div>

          {!currentDay.is_rest && (
            <div className="space-y-4">
              <Input
                placeholder="Label e.g. Push, Pull, Legs, Upper"
                value={currentDay.label}
                onChange={e => setLabel(activeDay, e.target.value)}
                className="bg-gray-800 border-gray-700"
              />

              {/* Exercises for this day */}
              <div className="space-y-2">
                {currentDay.exercises.map((ex, j) => (
                  <div key={j} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                    <span className="text-sm flex-1">{ex.exercise_name}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span>Sets</span>
                      <Input
                        value={ex.target_sets}
                        onChange={e => updateExerciseField(activeDay, j, 'target_sets', e.target.value)}
                        className="bg-gray-700 border-gray-600 w-12 h-7 text-center px-1 text-xs"
                      />
                      <span>Reps</span>
                      <Input
                        value={ex.target_reps_min}
                        onChange={e => updateExerciseField(activeDay, j, 'target_reps_min', e.target.value)}
                        className="bg-gray-700 border-gray-600 w-12 h-7 text-center px-1 text-xs"
                      />
                      <span>–</span>
                      <Input
                        value={ex.target_reps_max}
                        onChange={e => updateExerciseField(activeDay, j, 'target_reps_max', e.target.value)}
                        className="bg-gray-700 border-gray-600 w-12 h-7 text-center px-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => removeExercise(activeDay, j)}
                      className="text-gray-600 hover:text-red-400 text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExercisePicker(s => !s)}
              >
                {showExercisePicker ? 'Cancel' : '+ Add exercise'}
              </Button>

              {showExercisePicker && (
                <ExercisePicker exercises={exercises} onSelect={addExercise} />
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">{initialProgram ? 'Save edits' : 'Save program'}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  )
}
function ExercisePicker({ exercises, onSelect }) {
  const [search, setSearch] = useState('')
  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="bg-gray-800 rounded-lg p-2 space-y-2">
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-gray-700 border-gray-600 h-8 text-sm"
        autoFocus
      />
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.map(ex => (
          <button
            key={ex.id}
            onClick={() => onSelect(ex)}
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            <span className="font-medium">{ex.name}</span>
            <span className="text-gray-500 ml-2 text-xs">
              {ex.muscle_targets.filter(m => m.is_primary).map(m => m.muscle_group.name).join(', ')}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-500 px-3 py-2">No exercises found</p>
        )}
      </div>
    </div>
  )
}