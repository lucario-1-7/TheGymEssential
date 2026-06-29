import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Exercises from './pages/Exercises'
import Session from './pages/Session'
import Mesocycles from './pages/Mesocycles'
import Summary from './pages/Summary'
import Layout from './components/Layout'
import Workouts from './pages/Workouts'
import Progress from './pages/Progress'
import Bodyweight from './pages/Bodyweight'
import History from './pages/History'
import Outlines from './pages/Outlines'

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
        <Route path="progress" element={<Progress />} />
        <Route path="bodyweight" element={<Bodyweight />} />
        <Route path="history" element={<History />} />
        <Route path="outlines" element={<Outlines />} />
      </Route>
    </Routes>
  )
}

export default App