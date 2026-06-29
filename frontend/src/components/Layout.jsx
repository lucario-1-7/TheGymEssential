import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import Popup from './Popup'

const links = [
  { to: '/',            label: 'Dashboard'      },
  { to: '/workouts',    label: 'My Workouts'    },
  { to: '/history',     label: 'History'        },
  { to: '/progress',    label: 'Progress'       },
  { to: '/bodyweight',  label: 'Bodyweight'     },
  { to: '/outlines',    label: 'Workout Outlines' },
  { to: '/exercises',   label: 'Exercises'      },
]

export default function Layout() {
  const { user, logout, logoutEverywhere, changePassword } = useAuth()
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  function closePwModal() {
    setShowPwModal(false)
    setCurrentPw('')
    setNewPw('')
    setPwError('')
  }

  async function submitPasswordChange() {
    setPwError('')
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    try {
      await changePassword(currentPw, newPw)
      closePwModal()
      setPwSuccess(true)
    } catch (e) {
      setPwError(e.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <aside className="w-56 border-r border-gray-800 p-6 flex flex-col gap-2">
        <h1 className="text-lg font-medium mb-6">TheGymEssential</h1>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
        <div className="mt-auto pt-6 border-t border-gray-800">
          {user && <p className="text-xs text-gray-500 mb-2 px-3 truncate">{user.name}</p>}
          <button
            onClick={() => setShowPwModal(true)}
            className="px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
          >
            Change password
          </button>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
          >
            Log out
          </button>
          <button
            onClick={logoutEverywhere}
            className="px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
          >
            Log out everywhere
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>

      {showPwModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-medium">Change password</h3>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Current password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                  autoFocus
                />
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              {pwError && <p className="text-sm text-red-400">{pwError}</p>}
              <div className="flex gap-2">
                <Button onClick={submitPasswordChange} className="flex-1">Update</Button>
                <Button onClick={closePwModal} variant="secondary" className="flex-1">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Popup show={pwSuccess} onClose={() => setPwSuccess(false)}>
        <p className="text-sm font-medium text-green-300">Password updated</p>
      </Popup>
    </div>
  )
}