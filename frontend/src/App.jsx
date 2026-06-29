import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Exercises from './pages/Exercises'
import Session from './pages/Session'
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
