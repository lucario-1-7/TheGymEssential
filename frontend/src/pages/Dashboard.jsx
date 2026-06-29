import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  async function submitMissedReason() {
    if (!missedReason.trim()) return
    await post(`/missed/${USER_ID}/answer`, { reason: missedReason.trim() })
    setMissedPending([])
    setMissedDone(true)
  }

  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]

  return (
    <div className="space-y-6">
      {(missedPending.length > 0 || missedDone) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
            <CardContent className="pt-6 space-y-4">
              {!missedDone ? (
                <>
                  <img
                    src={angryEmoji}
                    alt=""
                    className="w-20 h-20 mx-auto"
                  />
                  <h3 className="text-lg font-bold text-red-400 tracking-wide text-center">
                    WHY DID YOU MISS THE LAST SESSION
                  </h3>
                  {missedPending.length > 1 && (
                    <p className="text-xs text-gray-500">
                      You skipped {missedPending.length} scheduled sessions.
                    </p>
                  )}
                  <textarea
                    value={missedReason}
                    onChange={e => setMissedReason(e.target.value)}
                    rows={3}
                    placeholder="Your reason..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm"
                    autoFocus
                  />
                  <Button onClick={submitMissedReason} className="w-full">Submit</Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-center">Don't let that happen again</p>
                  <Button onClick={() => setMissedDone(false)} className="w-full">Got it</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Dashboard</h2>
        <Button onClick={startSession}>Start session</Button>
      </div>

      {/* Today's workout plan */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today — {todayName}</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayPlan && (
            <p className="text-sm text-gray-500">No active program. Set one in My Workouts.</p>
          )}
          {todayPlan?.is_rest && (
            <p className="text-sm text-gray-400">Rest day. Recover well.</p>
          )}
          {todayPlan && !todayPlan.is_rest && (
            <div className="space-y-2">
              {todayPlan.label && (
                <p className="text-sm text-gray-400 mb-3">{todayPlan.label}</p>
              )}
              {todayPlan.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg">
                  <p className="text-sm">{ex.exercise.name}</p>
                  <p className="text-xs text-gray-500">
                    {ex.target_sets} sets · {ex.target_reps_min}–{ex.target_reps_max} reps
                  </p>
                </div>
              ))}
              
              {lastWeekSession && (
                <div className="bg-gray-800/60 rounded-lg p-3 my-4 border border-gray-700/50">
                  <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Last time you did this ({lastWeekSession.date})</p>
                  <div className="space-y-1.5">
                  {lastWeekSession.session_exercises?.map((se, idx) => {
                    const topWeight = se.sets.length > 0 ? Math.max(...se.sets.map(s => s.weight_kg || 0)) : 0
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">{se.exercise.name}</span>
                        <span className="text-gray-500">
                          {se.sets.length} sets {topWeight > 0 ? ` (Top: ${topWeight}kg)` : ''}
                        </span>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}
              
              <Button className="w-full mt-2" onClick={startSession}>
                Start today's session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent sessions */}
      <div className="space-y-2">
        <h3 className="text-sm text-gray-400">Recent sessions</h3>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-sm text-gray-500">No sessions yet.</p>
        )}
        {sessions.slice(0, 10).map(s => (
          <div
            key={s.id}
            onClick={() => navigate(`/session/${s.id}`)}
            className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg cursor-pointer hover:border-gray-600 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{s.date}</p>
              {s.notes && <p className="text-xs text-gray-500 mt-0.5">{s.notes}</p>}
            </div>
            {s.session_rpe && (
              <span className="text-xs text-gray-400">RPE {s.session_rpe}</span>
            )}
          </div>
        ))}
      </div>

      {/* Per-muscle volume tracker */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Volume by muscle</CardTitle>
          <div className="flex gap-1">
            {VOLUME_PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setVolumePeriod(p.key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  volumePeriod === p.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!volume && <p className="text-sm text-gray-500">Loading...</p>}
          {volume && volume.muscles.length === 0 && (
            <p className="text-sm text-gray-500">No sets logged in this period.</p>
          )}
          {volume && volume.muscles.length > 0 && (() => {
            const max = Math.max(...volume.muscles.map(m => m.sets))
            return (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {volume.total_sets} total sets
                </p>
                {volume.muscles.map(m => (
                  <div key={m.muscle} className="flex items-center gap-3">
                    <span className="w-24 text-sm capitalize text-gray-300">{m.muscle}</span>
                    <div className="flex-1 bg-gray-800 rounded h-5 overflow-hidden">
                      <div
                        className="bg-blue-500/70 h-full rounded"
                        style={{ width: max ? `${(m.sets / max) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-gray-400">{m.sets}</span>
                  </div>
                ))}
              </>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}