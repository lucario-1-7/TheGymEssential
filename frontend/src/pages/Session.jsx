import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { get, post, del } from '../api/index.js'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const USER_ID = 'd45ce928-b4dc-4d4a-9a7b-8e9450f7138d'
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Session() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [exercises, setExercises] = useState([])
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestion, setSuggestion] = useState({})

  useEffect(() => {
    get(`/sessions/detail/${sessionId}`).then(async (s) => {
      setSession(s)

      // if session has no exercises yet, auto-populate from today's program
      if (s.session_exercises?.length === 0) {
        try {
          const todayPlan = await get(`/programs/${USER_ID}/today`)
          if (todayPlan && !todayPlan.is_rest) {
            for (const [i, ex] of todayPlan.exercises.entries()) {
              await post(`/sessions/detail/${sessionId}/exercises`, {
                exercise_id: ex.exercise.id,
                order_index: i,
                target_sets: ex.target_sets,
                target_reps_min: ex.target_reps_min,
                target_reps_max: ex.target_reps_max,
              })
            }
            // reload session after populating
            const refreshed = await get(`/sessions/detail/${sessionId}`)
            setSession(refreshed)

            // fetch suggestions for each exercise
            for (const se of refreshed.session_exercises) {
              const sg = await get(`/sessions/${USER_ID}/suggestions/${se.exercise.id}`)
              setSuggestion(prev => ({ ...prev, [se.exercise.id]: sg }))
            }
          }
        } catch {
          // no active program, user adds exercises manually
        }
      } else {
        // fetch suggestions for already existing exercises
        for (const se of s.session_exercises) {
          const sg = await get(`/sessions/${USER_ID}/suggestions/${se.exercise.id}`)
          setSuggestion(prev => ({ ...prev, [se.exercise.id]: sg }))
        }
      }
    })

    get('/exercises').then(setExercises)
  }, [sessionId])

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  async function addExercise(exerciseId) {
    const orderIndex = session?.session_exercises?.length || 0
    const updated = await post(`/sessions/detail/${sessionId}/exercises`, {
      exercise_id: exerciseId,
      order_index: orderIndex,
    })
    setSession(prev => ({
      ...prev,
      session_exercises: [...(prev.session_exercises || []), updated],
    }))
    setShowExercisePicker(false)
    setSearch('')
    const sg = await get(`/sessions/${USER_ID}/suggestions/${exerciseId}`)
    setSuggestion(prev => ({ ...prev, [exerciseId]: sg }))
  }

  async function logSet(sessionExerciseId, exerciseId, setData) {
    const newSet = await post(`/sessions/exercises/${sessionExerciseId}/sets`, setData)
    setSession(prev => ({
      ...prev,
      session_exercises: prev.session_exercises.map(se =>
        se.id === sessionExerciseId
          ? { ...se, sets: [...(se.sets || []), newSet] }
          : se
      ),
    }))
    const sg = await get(`/sessions/${USER_ID}/suggestions/${exerciseId}`)
    setSuggestion(prev => ({ ...prev, [exerciseId]: sg }))
  }

  async function deleteSet(sessionExerciseId, setId) {
    await del(`/sessions/sets/${setId}`)
    setSession(prev => ({
      ...prev,
      session_exercises: prev.session_exercises.map(se =>
        se.id === sessionExerciseId
          ? { ...se, sets: se.sets.filter(s => s.id !== setId) }
          : se
      ),
    }))
  }

  if (!session) return <p className="text-sm text-gray-500">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Session — {session.date}</h2>
          {session.session_exercises?.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {session.session_exercises.length} exercises
            </p>
          )}
        </div>
        <Button onClick={() => { setShowExercisePicker(s => !s); setSearch('') }}>
          {showExercisePicker ? 'Cancel' : 'Add exercise'}
        </Button>
      </div>

      {showExercisePicker && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4 space-y-2">
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-gray-800 border-gray-700"
              autoFocus
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filtered.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex.id)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-800 transition-colors"
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
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {session.session_exercises?.map(se => (
          <ExerciseBlock
            key={se.id}
            se={se}
            suggestion={suggestion[se.exercise.id]}
            onLogSet={(data) => logSet(se.id, se.exercise.id, data)}
            onDeleteSet={(setId) => deleteSet(se.id, setId)}
          />
        ))}
      </div>
    </div>
  )
}

function ExerciseBlock({ se, suggestion, onLogSet, onDeleteSet }) {
  const isUnilateral = se.exercise.is_unilateral
  // A unilateral "set" is two rows (left + right) sharing one set_number, so count
  // by the highest set_number rather than the number of rows.
  const nextSetNumber = se.sets?.length
    ? Math.max(...se.sets.map(s => s.set_number)) + 1
    : 1

  const [form, setForm] = useState({
    weight_kg: '',
    weight_kg_left: '',
    weight_kg_right: '',
    reps: '',
    rir: '',
    is_warmup: false,
    notes: '',
  })

  useEffect(() => {
    if (!suggestion) return
    setForm(f => ({
      ...f,
      weight_kg: suggestion.suggested_weight ?? f.weight_kg,
      weight_kg_left: suggestion.suggested_weight_left ?? f.weight_kg_left,
      weight_kg_right: suggestion.suggested_weight_right ?? f.weight_kg_right,
    }))
  }, [suggestion])

  async function handleLog() {
    if (!form.reps || form.rir === '') return
    const base = {
      set_number: nextSetNumber,
      reps: parseInt(form.reps),
      rir: parseInt(form.rir),
      is_warmup: form.is_warmup,
      notes: form.notes || null,
    }
    if (isUnilateral) {
      // One left row and one right row, same set_number — enables asymmetry tracking.
      await onLogSet({ ...base, weight_kg: parseFloat(form.weight_kg_left) || null, side: 'left' })
      await onLogSet({ ...base, weight_kg: parseFloat(form.weight_kg_right) || null, side: 'right' })
    } else {
      await onLogSet({ ...base, weight_kg: parseFloat(form.weight_kg) || null, side: 'both' })
    }
    setForm(f => ({ ...f, reps: '', rir: '', is_warmup: false, notes: '' }))
  }

  // Working sets done = distinct set numbers (a unilateral set is two rows but one set).
  const setsDone = se.sets?.length
    ? new Set(se.sets.filter(s => !s.is_warmup).map(s => s.set_number)).size
    : 0
  const repTarget = se.target_reps_min
    ? `${se.target_reps_min}–${se.target_reps_max} reps`
    : null

  // Sets done vs the planned target, with an over/under flag for the daily log.
  let setStatus
  if (se.target_sets != null) {
    const diff = setsDone - se.target_sets
    if (diff === 0) setStatus = { text: `${setsDone}/${se.target_sets} sets`, cls: 'text-green-400' }
    else if (diff > 0) setStatus = { text: `${setsDone}/${se.target_sets} sets · +${diff} extra`, cls: 'text-amber-400' }
    else setStatus = { text: `${setsDone}/${se.target_sets} sets · ${-diff} short`, cls: 'text-orange-400' }
  } else {
    setStatus = { text: `${setsDone} set${setsDone === 1 ? '' : 's'}`, cls: 'text-gray-500' }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{se.exercise.name}</CardTitle>
        <div className="flex gap-3 mt-0.5 flex-wrap items-center">
          <p className={`text-xs font-medium ${setStatus.cls}`}>{setStatus.text}</p>
          {repTarget && <p className="text-xs text-gray-500">{repTarget}</p>}
          {suggestion && <p className="text-xs text-blue-400">{suggestion.reason}</p>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {se.sets?.length > 0 && (
          <div className="space-y-1">
            {se.sets.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm px-2 py-1.5 bg-gray-800 rounded">
                <span className="text-gray-400 w-12">
                  Set {s.set_number}{s.is_warmup ? ' ·W' : ''}
                </span>
                <div className="flex-1 text-center">
                  <div>
                    {s.side !== 'both' && (
                      <span className="text-gray-500 mr-1">{s.side === 'left' ? 'L' : 'R'}</span>
                    )}
                    {s.weight_kg}kg × {s.reps} @ RIR {s.rir}
                  </div>
                  {s.notes && <div className="text-[10px] text-gray-500 italic mt-0.5">"{s.notes}"</div>}
                </div>
                <button
                  onClick={() => onDeleteSet(s.id)}
                  className="text-gray-600 hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {(suggestion?.pr || suggestion?.last_session) && (
            <div className={`grid gap-2 text-xs ${suggestion?.pr && suggestion?.last_session ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {suggestion.pr && (
                <div className="bg-yellow-950/10 p-2 rounded border border-yellow-900/30">
                  <p className="text-yellow-500 font-medium mb-1 flex items-center gap-1">🥇 PR</p>
                  <p className="text-gray-300 font-medium">{suggestion.pr.weight_kg}kg × {suggestion.pr.reps}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{suggestion.pr.date}</p>
                </div>
              )}
              {suggestion.last_session && (
                <div className="bg-blue-950/10 p-2 rounded border border-blue-900/30">
                  <p className="text-blue-400 font-medium mb-1 flex items-center gap-1">🕒 Last time</p>
                  <div className="space-y-0.5 text-gray-300">
                    {suggestion.last_session.sets.map(s => (
                      <p key={s.id}>
                        {s.side !== 'both' ? `${s.side === 'left' ? 'L' : 'R'} ` : ''}
                        {s.weight_kg || 0}kg × {s.reps}
                      </p>
                    ))}
                  </div>
                  <p className="text-gray-500 text-[10px] mt-0.5">{suggestion.last_session.date}</p>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">Log set {nextSetNumber}</p>
          <div className="flex gap-2 flex-wrap">
            {isUnilateral ? (
              <>
                <Input
                  placeholder="Left kg"
                  value={form.weight_kg_left}
                  onChange={e => setForm(f => ({ ...f, weight_kg_left: e.target.value }))}
                  className="bg-gray-800 border-gray-700 w-24"
                />
                <Input
                  placeholder="Right kg"
                  value={form.weight_kg_right}
                  onChange={e => setForm(f => ({ ...f, weight_kg_right: e.target.value }))}
                  className="bg-gray-800 border-gray-700 w-24"
                />
              </>
            ) : (
              <Input
                placeholder="Weight kg"
                value={form.weight_kg}
                onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                className="bg-gray-800 border-gray-700 w-28"
              />
            )}
            <Input
              placeholder="Reps"
              value={form.reps}
              onChange={e => setForm(f => ({ ...f, reps: e.target.value }))}
              className="bg-gray-800 border-gray-700 w-20"
            />
            <Input
              placeholder="RIR"
              value={form.rir}
              onChange={e => setForm(f => ({ ...f, rir: e.target.value }))}
              className="bg-gray-800 border-gray-700 w-16"
            />
            <Input
              placeholder="Comments (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-gray-800 border-gray-700 flex-1 min-w-[140px]"
            />
            <label className="flex items-center gap-1 text-xs text-gray-400 select-none">
              <input
                type="checkbox"
                checked={form.is_warmup}
                onChange={e => setForm(f => ({ ...f, is_warmup: e.target.checked }))}
              />
              Warm-up
            </label>
            <Button onClick={handleLog}>Log set</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}