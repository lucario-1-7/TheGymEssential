import { useEffect, useState } from 'react'
import { get } from '../api/index.js'
import { useUserId } from '../auth/AuthContext'
import { Card, CardContent } from '../components/ui/card'

const PERIODS = [
  { key: 'week', label: 'This week' },
  { key: 'all',  label: 'All time'  },
]

export default function Volume() {
  const USER_ID = useUserId()
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)

  useEffect(() => {
    setData(null)
    get(`/volume/${USER_ID}?period=${period}`).then(setData).catch(() => setData(null))
  }, [period])

  const max = data && data.muscles.length ? Math.max(...data.muscles.map(m => m.sets)) : 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Volume</h2>
      <p className="text-sm text-gray-500">
        Working sets per muscle, counted where it's the exercise's primary target.
      </p>

      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              period === p.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!data && <p className="text-sm text-gray-500">Loading...</p>}

      {data && data.muscles.length === 0 && (
        <p className="text-sm text-gray-500">No sets logged in this period.</p>
      )}

      {data && data.muscles.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {data.total_sets} total sets
            </p>
            {data.muscles.map(m => (
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
