import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'

// A small reusable line chart. Expects `data` as an array of objects already
// sorted ascending by the x value, and the keys to plot on each axis.
export default function TrendChart({ data, xKey = 'date', yKey, color = '#8b5cf6', unit = '' }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey={xKey} stroke="#a1a1aa" fontSize={11} />
        <YAxis stroke="#a1a1aa" fontSize={11} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#161618', border: '1px solid #27272a', borderRadius: 8, fontSize: 12, color: '#f4f4f5' }}
          labelStyle={{ color: '#a1a1aa' }}
          formatter={(value) => [`${value}${unit}`, '']}
        />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
