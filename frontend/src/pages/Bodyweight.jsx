import { useEffect, useState } from 'react'
import { get, post } from '../api/index.js'
import { useUserId } from '../auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import TrendChart from '../components/TrendChart'

// Local calendar date as YYYY-MM-DD. Using en-CA (not toISOString, which converts
// to UTC and can roll the date forward/back across midnight).
function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}

export default function Bodyweight() {
  const USER_ID = useUserId()
  const [logs, setLogs] = useState([])
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [error, setError] = useState('')

  function load() {
    get(`/users/${USER_ID}/bodyweight`).then(setLogs)
  }
  useEffect(load, [])

  async function logWeight() {
    setError('')
    const w = parseFloat(weight)
    if (!w || w <= 0) { setError('Enter a valid weight.'); return }
    try {
      await post(`/users/${USER_ID}/bodyweight`, { weight_kg: w, date })
      setWeight('')
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const latest = logs.length ? logs[logs.length - 1] : null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Bodyweight</h2>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-gray-800 border-gray-700 w-40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Weight (kg)</label>
            <Input
              placeholder="e.g. 80.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="bg-gray-800 border-gray-700 w-32"
            />
          </div>
          <Button onClick={logWeight}>Log</Button>
          {latest && (
            <span className="text-xs text-gray-500 ml-auto">
              Latest: {latest.weight_kg}kg on {latest.date}
            </span>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0
            ? <p className="text-sm text-gray-500">No bodyweight logged yet. Add your first entry above.</p>
            : <TrendChart data={logs} yKey="weight_kg" color="#a78bfa" unit="kg" />}
        </CardContent>
      </Card>
    </div>
  )
}
