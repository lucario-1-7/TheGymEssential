import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Exercises from './pages/Exercises'
import Session from './pages/Session'
import Mesocycles from './pages/Mesocycles'
import Summary from './pages/Summary'
import Layout from './components/Layout'
import Workouts from './pages/Workouts'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="session/:sessionId" element={<Session />} />
        <Route path="mesocycles" element={<Mesocycles />} />
        <Route path="mesocycles/:mesocycleId/summary" element={<Summary />} />
        <Route path="workouts" element={<Workouts />} />
      </Route>
    </Routes>
  )
}

export default App