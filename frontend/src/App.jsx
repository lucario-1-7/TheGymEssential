import { Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import Dashboard from './pages/Dashboard'
import Exercises from './pages/Exercises'
import Session from './pages/Session'
import Layout from './components/Layout'
import Workouts from './pages/Workouts'
import Progress from './pages/Progress'
import Bodyweight from './pages/Bodyweight'
import History from './pages/History'
import Outlines from './pages/Outlines'
import Backup from './pages/Backup'
import Onboarding from './components/Onboarding'

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Onboarding />
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
        <Route path="backup" element={<Backup />} />
        </Route>
      </Routes>
    </MotionConfig>
  )
}

export default App
