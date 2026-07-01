import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { get, post } from '../api/index.js'
import { useUserId } from '../auth/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import angryEmoji from '../assets/angry-emoji.png'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const VOLUME_PERIODS = [
  { key: 'week', label: 'This week' },
  { key: 'all',  label: 'All time'  },
]

export default function Dashboard() {
  const USER_ID = useUserId()
  const [sessions, setSessions] = useState([])
  const [todayPlan, setTodayPlan] = useState(null)
  const [lastWeekSession, setLastWeekSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [missedPending, setMissedPending] = useState([])
  const [missedReason, setMissedReason] = useState('')
  const [missedDone, setMissedDone] = useState(false)
  const [volume, setVolume] = useState(null)
  const [volumePeriod, setVolumePeriod] = useState('week')
  const [activeProgram, setActiveProgram] = useState(null)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    get(`/sessions/${USER_ID}`)
      .then(async data => {
        const allSessions = Array.isArray(data) ? data : []
        setSessions(allSessions)

        const currentDayOfWeek = new Date().getDay()
        const todayStr = new Date().toISOString().split('T')[0]
        const sameDaySession = allSessions.find(s => {
          // Parse date properly (assuming YYYY-MM-DD input, appending T12:00:00Z to avoid timezone shifts)
          const sDate = new Date(s.date + 'T12:00:00Z')
          return sDate.getDay() === currentDayOfWeek && s.date !== todayStr
        })

        if (sameDaySession) {
          try {
            const detail = await get(`/sessions/detail/${sameDaySession.id}`)
            setLastWeekSession(detail)
          } catch(e) {}
        }
      })
      .finally(() => setLoading(false))

    get(`/programs/${USER_ID}/today`)
      .then(data => setTodayPlan(data))
      .catch(() => setTodayPlan(null))

    // Active program's days, for the "doing a different workout?" picker.
    get(`/programs/${USER_ID}`)
      .then(ps => setActiveProgram(Array.isArray(ps) ? ps.find(p => p.is_active) || null : null))
      .catch(() => setActiveProgram(null))

    // Detect skipped scheduled sessions since the last time you trained.
    post(`/missed/${USER_ID}/scan`).then(setMissedPending).catch(() => {})
  }, [])

  // Per-muscle volume tracker — refetches when the period toggle changes.
  useEffect(() => {
    setVolume(null)
    get(`/volume/${USER_ID}?period=${volumePeriod}`).then(setVolume).catch(() => setVolume(null))
  }, [volumePeriod])

  async function startSession() {
    const today = new Date().toISOString().split('T')[0]
    const session = await post(`/sessions/${USER_ID}`, { date: today })
    navigate(`/session/${session.id}`)
  }

  // Start today's session but populated from a chosen program day (not today's).
  // Pre-filling the exercises means the Session screen skips its auto-populate.
  async function startSessionWithDay(day) {
    const today = new Date().toISOString().split('T')[0]
    const session = await post(`/sessions/${USER_ID}`, { date: today })
    for (const [i, ex] of day.exercises.entries()) {
      await post(`/sessions/detail/${session.id}/exercises`, {
        exercise_id: ex.exercise.id,
        order_index: i,
        target_sets: ex.target_sets,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max,
      })
    }
    navigate(`/session/${session.id}`)
  }

  async function submitMissedReason() {
    if (!missedReason.trim()) return
    await post(`/missed/${USER_ID}/answer`, { reason: missedReason.trim() })
    setMissedPending([])
    setMissedDone(true)
  }

  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  const trainingDays = activeProgram?.days?.filter(d => !d.is_rest && d.exercises?.length) || []

  return (
    <div className="space-y-6">
      {(missedPending.length > 0 || missedDone) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 pt-6">
              {!missedDone ? (
                <>
                  <img src={angryEmoji} alt="" className="mx-auto h-20 w-20" />
                  <h3 className="text-center text-lg font-medium tracking-wide text-destructive">
                    WHY DID YOU MISS THE LAST SESSION
                  </h3>
                  {missedPending.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      You skipped {missedPending.length} scheduled sessions.
                    </p>
                  )}
                  <textarea
                    value={missedReason}
                    onChange={e => setMissedReason(e.target.value)}
                    rows={3}
                    placeholder="Your reason..."
                    className="w-full rounded-md border border-border bg-secondary p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    autoFocus
                  />
                  <Button onClick={submitMissedReason} className="w-full">Submit</Button>
                </>
              ) : (
                <>
                  <p className="text-center text-lg font-medium">Don't let that happen again</p>
                  <Button onClick={() => setMissedDone(false)} className="w-full">Got it</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-medium">Ready to chadmaxx?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateLabel}{todayPlan?.label ? ` · ${todayPlan.label}` : ''}
          </p>
        </div>
        <Button onClick={startSession}>Start session</Button>
      </div>

      {/* Per-muscle volume tracker — the centerpiece. */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-lg">Volume by muscle</CardTitle>
          <div className="flex gap-1">
            {VOLUME_PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setVolumePeriod(p.key)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  volumePeriod === p.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!volume && <p className="text-sm text-muted-foreground">Loading...</p>}
          {volume && volume.muscles.length === 0 && (
            <p className="text-sm text-muted-foreground">No sets logged in this period.</p>
          )}
          {volume && volume.muscles.length > 0 && (() => {
            const max = Math.max(...volume.muscles.map(m => m.sets))
            return (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {volume.total_sets} total sets
                </p>
                <div className="space-y-3.5">
                  {volume.muscles.map(m => (
                    <div key={m.muscle}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="capitalize">{m.muscle}</span>
                        <span className="tnum text-muted-foreground">{m.sets}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: max ? `${(m.sets / max) * 100}%` : '0%' }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* Today's workout plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today — {todayName}</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayPlan && (
            <p className="text-sm text-muted-foreground">No active program. Set one in My Workouts.</p>
          )}
          {todayPlan?.is_rest && (
            <p className="text-sm text-muted-foreground">Rest day. Recover well.</p>
          )}
          {todayPlan && !todayPlan.is_rest && (
            <div className="space-y-2">
              {todayPlan.label && (
                <p className="mb-3 text-sm text-muted-foreground">{todayPlan.label}</p>
              )}
              {todayPlan.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                  <p className="text-sm">{ex.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.target_sets} sets · {ex.target_reps_min}–{ex.target_reps_max} reps
                  </p>
                </div>
              ))}

              {lastWeekSession && (
                <div className="my-4 rounded-lg border border-border bg-secondary/60 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Last time you did this ({lastWeekSession.date})</p>
                  <div className="space-y-1.5">
                  {lastWeekSession.session_exercises?.map((se, idx) => {
                    const topWeight = se.sets.length > 0 ? Math.max(...se.sets.map(s => s.weight_kg || 0)) : 0
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{se.exercise.name}</span>
                        <span className="text-muted-foreground">
                          {se.sets.length} sets {topWeight > 0 ? ` (Top: ${topWeight}kg)` : ''}
                        </span>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}

              <Button className="mt-2 w-full" onClick={startSession}>
                Start today's session
              </Button>
            </div>
          )}

          {trainingDays.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <button
                onClick={() => setShowDayPicker(s => !s)}
                className="text-xs text-primary hover:underline"
              >
                Doing a different workout?
              </button>
              {showDayPicker && (
                <div className="mt-2 space-y-1">
                  {trainingDays.map(d => (
                    <button
                      key={d.id}
                      onClick={() => startSessionWithDay(d)}
                      className="flex w-full items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span>{d.label || DAYS[d.day_of_week]}</span>
                      <span className="text-xs text-muted-foreground">{d.exercises.length} exercises</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent sessions */}
      <div className="space-y-2">
        <h3 className="text-sm text-muted-foreground">Recent sessions</h3>
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        )}
        {sessions.slice(0, 10).map(s => (
          <div
            key={s.id}
            onClick={() => navigate(`/session/${s.id}`)}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
          >
            <div>
              <p className="text-sm font-medium">{s.date}</p>
              {s.notes && <p className="mt-0.5 text-xs text-muted-foreground">{s.notes}</p>}
            </div>
            {s.session_rpe && (
              <span className="text-xs text-muted-foreground">RPE {s.session_rpe}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
