import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'

// A small reusable line chart. Expects `data` as an array of objects already
// sorted ascending by the x value, and the keys to plot on each axis.
export default function TrendChart({ data, xKey = 'date', yKey, color = '#60a5fa', unit = '' }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">No data yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey={xKey} stroke="#6b7280" fontSize={11} />
        <YAxis stroke="#6b7280" fontSize={11} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(value) => [`${value}${unit}`, '']}
        />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
