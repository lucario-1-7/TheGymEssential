import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const links = [
  { to: '/',            label: 'Dashboard'      },
  { to: '/workouts',    label: 'My Workouts'    },
  { to: '/outlines',    label: 'Workout Outlines' },
  { to: '/exercises',   label: 'Exercises'      },
  { to: '/history',     label: 'History'        },
  { to: '/progress',    label: 'Progress'       },
  { to: '/bodyweight',  label: 'Bodyweight'     },
  { to: '/mesocycles',  label: 'Mesocycles'     },
]

export default function Layout() {
  const { user, logout } = useAuth()
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
            onClick={logout}
            className="px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}