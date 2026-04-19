import { Outlet, NavLink } from 'react-router-dom'

const links = [
  { to: '/',            label: 'Dashboard'   },
  { to: '/workouts',    label: 'My Workouts' },
  { to: '/exercises',   label: 'Exercises'   },
  { to: '/mesocycles',  label: 'Mesocycles'  },
]

export default function Layout() {
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
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}