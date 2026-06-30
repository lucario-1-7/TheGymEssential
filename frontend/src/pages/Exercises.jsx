import { useEffect, useState } from 'react'
import { get, post, del } from '../api/index.js'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const MOVEMENT_PATTERNS = ['push', 'pull', 'hinge', 'squat', 'carry']
const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight']

export default function Exercises() {
  const [exercises, setExercises] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    movement_pattern: 'push',
    equipment: 'barbell',
    is_unilateral: false,
    muscles: [],
  })

  useEffect(() => {
    get('/exercises').then(setExercises)
    get('/exercises/muscle-groups').then(setMuscleGroups)
  }, [])

  function toggleMuscle(id) {
    setForm(f => {
      const exists = f.muscles.find(m => m.muscle_group_id === id)
      if (!exists) {
        return { ...f, muscles: [...f.muscles, { muscle_group_id: id, is_primary: true }] }
      } else if (exists.is_primary) {
        return {
          ...f,
          muscles: f.muscles.map(m => m.muscle_group_id === id ? { ...m, is_primary: false } : m)
        }
      } else {
        return { ...f, muscles: f.muscles.filter(m => m.muscle_group_id !== id) }
      }
    })
  }

  function isMuscleSelected(id) {
    return form.muscles.some(m => m.muscle_group_id === id)
  }

  async function handleSubmit() {
    if (!form.name || form.muscles.length === 0) return
    const created = await post('/exercises/', form)
    setExercises(prev => [...prev, created])
    setForm({ name: '', movement_pattern: 'push', equipment: 'barbell', is_unilateral: false, muscles: [] })
    setShowForm(false)
  }

  async function handleDelete(id) {
    await del(`/exercises/${id}`)
    setExercises(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Exercises</h2>
        <Button onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : 'Add exercise'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Exercise name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-secondary border-border"
            />

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Movement</label>
                <select
                  value={form.movement_pattern}
                  onChange={e => setForm(f => ({ ...f, movement_pattern: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                >
                  {MOVEMENT_PATTERNS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Equipment</label>
                <select
                  value={form.equipment}
                  onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                >
                  {EQUIPMENT.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_unilateral}
                onChange={e => setForm(f => ({ ...f, is_unilateral: e.target.checked }))}
              />
              Unilateral exercise
            </label>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Muscles (click once for primary, twice for secondary, again to remove)
              </label>
              <div className="flex flex-wrap gap-2">
                {muscleGroups.map(mg => {
                  const selected = form.muscles.find(m => m.muscle_group_id === mg.id)
                  return (
                    <button
                      key={mg.id}
                      onClick={() => toggleMuscle(mg.id)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        selected?.is_primary
                          ? 'bg-primary text-primary-foreground border-primary'
                          : selected
                          ? 'bg-muted text-foreground border-border'
                          : 'bg-transparent text-muted-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      {mg.name} {selected?.is_primary ? '(primary)' : selected ? '(secondary)' : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full">Save exercise</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {exercises.map(ex => (
          <div
            key={ex.id}
            className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg"
          >
            <div>
              <p className="text-sm font-medium">{ex.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ex.movement_pattern} · {ex.equipment}
                {ex.is_unilateral ? ' · unilateral' : ''}
                {' · '}
                {ex.muscle_targets
                  .filter(m => m.is_primary)
                  .map(m => m.muscle_group.name)
                  .join(', ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-400"
              onClick={() => handleDelete(ex.id)}
            >
              Delete
            </Button>
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="text-sm text-muted-foreground">No exercises yet. Add one above.</p>
        )}
      </div>
    </div>
  )
}