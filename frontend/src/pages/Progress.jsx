import { useEffect, useState } from 'react'
import { get } from '../api/index.js'
import { useUserId } from '../auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import TrendChart from '../components/TrendChart'

const METRICS = [
  { key: 'e1rm',         label: 'Est. 1RM',   unit: 'kg', color: '#60a5fa' },
  { key: 'top_weight',   label: 'Top weight', unit: 'kg', color: '#34d399' },
  { key: 'total_volume', label: 'Volume',     unit: 'kg', color: '#f59e0b' },
]

export default function Progress() {
  const USER_ID = useUserId()
  const [exercises, setExercises] = useState([])
  const [selected, setSelected] = useState('')
  const [data, setData] = useState(null)
  const [metric, setMetric] = useState('e1rm')

  useEffect(() => {
    get('/exercises').then(list => {
      setExercises(list)
      if (list.length) setSelected(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    setData(null)
    get(`/progress/${USER_ID}/exercise/${selected}`).then(setData).catch(() => setData(null))
  }, [selected])

  const activeMetric = METRICS.find(m => m.key === metric)
  const hasData = data && data.series.length > 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Progress</h2>

      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm w-full max-w-sm"
      >
        {exercises.map(ex => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {!data && <p className="text-sm text-gray-500">Loading...</p>}

      {data && !hasData && (
        <p className="text-sm text-gray-500">No sets logged for this exercise yet.</p>
      )}

      {hasData && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Best e1RM</p>
                <p className="text-2xl font-medium">{data.best_e1rm ?? '—'}<span className="text-sm text-gray-500"> kg</span></p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">PR</p>
                {data.pr
                  ? <p className="text-2xl font-medium">{data.pr.weight_kg}<span className="text-sm text-gray-500">kg × {data.pr.reps}</span></p>
                  : <p className="text-gray-500">—</p>}
                {data.pr && <p className="text-[11px] text-gray-500 mt-0.5">{data.pr.date}</p>}
              </CardContent>
            </Card>
            <PlateauCard plateau={data.plateau} />
          </div>

          <div className="flex gap-2">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  metric === m.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{activeMetric.label} over time</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={data.series}
                yKey={activeMetric.key}
                color={activeMetric.color}
                unit={activeMetric.unit}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function PlateauCard({ plateau }) {
  const tone = plateau.status === 'insufficient_data'
    ? 'border-gray-800 text-gray-400'
    : plateau.is_plateaued
      ? 'border-red-900/40 text-red-400'
      : 'border-green-900/40 text-green-400'
  const heading = plateau.status === 'insufficient_data'
    ? 'Trend'
    : plateau.is_plateaued ? 'Plateau' : 'Progressing'
  return (
    <Card className={`bg-gray-900 ${tone}`}>
      <CardContent className="pt-4">
        <p className="text-xs uppercase tracking-wide">{heading}</p>
        <p className="text-xs mt-1 text-gray-400">{plateau.message}</p>
      </CardContent>
    </Card>
  )
}
