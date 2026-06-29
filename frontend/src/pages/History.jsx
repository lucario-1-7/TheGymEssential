import { useEffect, useState } from 'react'
import { get } from '../api/index.js'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'

const USER_ID = 'd45ce928-b4dc-4d4a-9a7b-8e9450f7138d'

export default function History() {
  const [sessions, setSessions] = useState([])
  const [openId, setOpenId] = useState(null)
  const [details, setDetails] = useState({})
  const [date, setDate] = useState('')
  const [dateResults, setDateResults] = useState(null) // null = not searched
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    get(`/sessions/${USER_ID}`).then(setSessions)
  }, [])

  const INITIAL_VISIBLE = 10
  const visible = showAll ? sessions : sessions.slice(0, INITIAL_VISIBLE)

  async function toggle(id) {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id)
    if (!details[id]) {
      const d = await get(`/sessions/detail/${id}`)
      setDetails(prev => ({ ...prev, [id]: d }))
    }
  }

  async function lookupDate(d) {
    setDate(d)
    if (!d) { setDateResults(null); return }
    const res = await get(`/sessions/${USER_ID}/by-date?date=${d}`)
    setDateResults(res)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">History</h2>

      {/* Date lookup */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Jump to a date</label>
              <Input
                type="date"
                value={date}
                onChange={e => lookupDate(e.target.value)}
                className="bg-gray-800 border-gray-700 w-44"
              />
            </div>
          </div>
          {dateResults !== null && (
            dateResults.length === 0
              ? <p className="text-sm text-gray-500">No session logged on {date}.</p>
              : <div className="space-y-3">{dateResults.map(s => <SessionDetail key={s.id} detail={s} />)}</div>
          )}
        </CardContent>
      </Card>

      {/* All sessions */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          All sessions ({sessions.length})
        </p>
        {sessions.length === 0 && <p className="text-sm text-gray-500">No sessions logged yet.</p>}
        {visible.map(s => (
          <Card key={s.id} className="bg-gray-900 border-gray-800">
            <button
              onClick={() => toggle(s.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors rounded-lg"
            >
              <span className="font-medium">{s.date}</span>
              <span className="text-gray-500 text-sm">
                {s.session_rpe != null ? `RPE ${s.session_rpe}` : ''} {openId === s.id ? '▲' : '▼'}
              </span>
            </button>
            {openId === s.id && (
              <CardContent className="pt-0">
                {details[s.id]
                  ? <SessionDetail detail={details[s.id]} bare />
                  : <p className="text-sm text-gray-500">Loading...</p>}
              </CardContent>
            )}
          </Card>
        ))}
        {sessions.length > INITIAL_VISIBLE && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full text-sm text-blue-400 hover:text-blue-300 py-2"
          >
            {showAll ? 'Show less' : `View all ${sessions.length} sessions`}
          </button>
        )}
      </div>
    </div>
  )
}

// Renders one session's exercises and sets. `bare` drops the outer date heading
// (used inside an already-labeled expandable card).
function SessionDetail({ detail, bare = false }) {
  return (
    <div className="space-y-3">
      {!bare && <p className="font-medium">{detail.date}</p>}
      {detail.notes && <p className="text-xs text-gray-500 italic">"{detail.notes}"</p>}
      {detail.session_exercises.length === 0 && (
        <p className="text-sm text-gray-500">No exercises logged.</p>
      )}
      {detail.session_exercises.map(se => {
        const setsDone = new Set(se.sets.filter(s => !s.is_warmup).map(s => s.set_number)).size
        let status = `${setsDone} set${setsDone === 1 ? '' : 's'}`
        let cls = 'text-gray-500'
        if (se.target_sets != null) {
          const diff = setsDone - se.target_sets
          status = `${setsDone}/${se.target_sets} sets`
          if (diff > 0) { status += ` · +${diff} extra`; cls = 'text-amber-400' }
          else if (diff < 0) { status += ` · ${-diff} short`; cls = 'text-orange-400' }
          else { cls = 'text-green-400' }
        }
        return (
          <div key={se.id} className="border-l-2 border-gray-800 pl-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{se.exercise.name}</span>
              <span className={`text-xs ${cls}`}>{status}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {se.sets.map(s => (
                <div key={s.id} className="text-xs text-gray-400">
                  Set {s.set_number}{s.is_warmup ? ' ·W' : ''} —{' '}
                  {s.side !== 'both' ? `${s.side === 'left' ? 'L ' : 'R '}` : ''}
                  {s.weight_kg ?? 0}kg × {s.reps} @ RIR {s.rir}
                </div>
              ))}
              {se.sets.length === 0 && <div className="text-xs text-gray-600">no sets</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
