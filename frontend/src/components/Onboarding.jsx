import { useEffect, useState } from 'react'
import { restoreFromDrive } from '../lib/driveBackup'
import { hasUserData } from '../local/db'

const KEY = 'tge.onboarded'

// One-time first-launch screen. Lets a new install either pull existing data from a
// Google Drive backup or start fresh. Shown only when the `onboarded` flag is unset;
// anyone who already has local data is treated as an existing user and skipped.
export default function Onboarding() {
  const [done, setDone] = useState(() => !!localStorage.getItem(KEY))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Existing users predate this screen — don't show it to them.
  useEffect(() => {
    if (localStorage.getItem(KEY)) return
    hasUserData().then(has => { if (has) finish() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (done) return null

  function finish() {
    localStorage.setItem(KEY, '1')
    setDone(true)
  }

  async function handleRestore() {
    setBusy(true)
    setError('')
    try {
      await restoreFromDrive()
      finish()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h1 className="text-xl font-medium text-white">Welcome to TheGymEssential</h1>
        <p className="mt-2 text-sm text-gray-400">
          Your data is stored on this device. If you have a Google Drive backup from
          another device, you can restore it now — otherwise just start fresh.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleRestore}
            disabled={busy}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            {busy ? 'Restoring...' : 'Restore from Google Drive'}
          </button>
          <button
            onClick={finish}
            disabled={busy}
            className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            Start fresh
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
