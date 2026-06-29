import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const links = [
  { to: '/',            label: 'Dashboard'      },
  { to: '/workouts',    label: 'My Workouts'    },
  { to: '/history',     label: 'History'        },
  { to: '/progress',    label: 'Progress'       },
  { to: '/bodyweight',  label: 'Bodyweight'     },
  { to: '/outlines',    label: 'Workout Outlines' },
  { to: '/exercises',   label: 'Exercises'      },
]

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm transition-colors ${
    isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
  }`

function NavLinks({ onNavigate }) {
  return links.map(l => (
    <NavLink key={l.to} to={l.to} end onClick={onNavigate} className={linkClass}>
      {l.label}
    </NavLink>
  ))
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-950 text-white md:flex">
      {/* Mobile top bar */}
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3 md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1 text-gray-300">
          <HamburgerIcon />
        </button>
        <span className="text-base font-medium">TheGymEssential</span>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col gap-2 border-r border-gray-800 p-6 md:flex">
        <h1 className="mb-6 text-lg font-medium">TheGymEssential</h1>
        <NavLinks />
      </aside>

      {/* Mobile slide-out drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col gap-2 border-r border-gray-800 bg-gray-950 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-lg font-medium">TheGymEssential</h1>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 text-gray-300">
                <CloseIcon />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
