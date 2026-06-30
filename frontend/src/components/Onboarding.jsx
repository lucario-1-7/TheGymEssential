import { useEffect, useState } from 'react'
import { restoreFromDrive } from '../lib/driveBackup'
import { hasUserData } from '../local/db'
import { Button } from './ui/button'

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-medium">Welcome to TheGymEssential</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your data is stored on this device. If you have a Google Drive backup from
          another device, you can restore it now, otherwise just start fresh.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={handleRestore} disabled={busy}>
            {busy ? 'Restoring...' : 'Restore from Google Drive'}
          </Button>
          <Button variant="outline" onClick={finish} disabled={busy}>
            Start fresh
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
