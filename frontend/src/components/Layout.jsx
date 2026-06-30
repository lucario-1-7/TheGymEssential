import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Home, History, LineChart, MoreHorizontal, X,
  Dumbbell, ListChecks, Scale, ClipboardList, CloudUpload,
} from 'lucide-react'

// Primary destinations get a bottom tab on mobile; the rest live behind "More".
const primaryNav = [
  { to: '/',          label: 'Home',     icon: Home,      end: true },
  { to: '/history',   label: 'History',  icon: History },
  { to: '/progress',  label: 'Progress', icon: LineChart },
]
const secondaryNav = [
  { to: '/workouts',  label: 'My Workouts',      icon: ListChecks },
  { to: '/outlines',  label: 'Workout Outlines', icon: ClipboardList },
  { to: '/bodyweight',label: 'Bodyweight',       icon: Scale },
  { to: '/exercises', label: 'Exercises',        icon: Dumbbell },
  { to: '/backup',    label: 'Backup',           icon: CloudUpload },
]
const allNav = [...primaryNav, ...secondaryNav]

const sideLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-primary/15 text-primary font-medium'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

const tabClass = (active) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] transition-colors ${
    active ? 'text-primary' : 'text-muted-foreground'
  }`

function Logo({ className }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-primary ${className}`}>
      <Dumbbell className="h-4 w-4 text-primary-foreground" />
    </div>
  )
}

export default function Layout() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const onSecondary = secondaryNav.some(l => l.to === pathname)

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border p-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-base font-medium">TheGymEssential</h1>
        </div>
        {allNav.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end} className={sideLinkClass}>
            <l.icon className="h-[18px] w-[18px]" />
            {l.label}
          </NavLink>
        ))}
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center gap-2 border-b border-border px-4 py-3 md:hidden">
        <Logo className="h-7 w-7" />
        <span className="text-base font-medium">TheGymEssential</span>
      </header>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        {/* Fast fade/slide on route change. Keyed by path so each page re-enters;
            no exit animation keeps navigation snappy. */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {primaryNav.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end} className="flex-1">
            {({ isActive }) => (
              <span className={tabClass(isActive)}>
                <l.icon className="h-[22px] w-[22px]" />
                {l.label}
              </span>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)} className="flex-1">
          <span className={tabClass(onSecondary || moreOpen)}>
            <MoreHorizontal className="h-[22px] w-[22px]" />
            More
          </span>
        </button>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">More</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close menu" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {secondaryNav.map(l => (
                <NavLink key={l.to} to={l.to} onClick={() => setMoreOpen(false)} className={sideLinkClass}>
                  <l.icon className="h-[18px] w-[18px]" />
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
