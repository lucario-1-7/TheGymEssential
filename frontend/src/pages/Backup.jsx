import { useEffect, useState } from 'react'
import { backupToDrive, restoreFromDrive, getBackupInfo } from '../lib/driveBackup'
import Popup from '../components/Popup'

// Drive backup screen: one backup file per account in the hidden appData folder.
// Backup is safe; restore is destructive (it replaces all local data), so it asks
// for confirmation first.
export default function Backup() {
  const [info, setInfo] = useState(null)      // { latest, count } | null
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(null)       // 'backup' | 'restore' | null
  const [confirming, setConfirming] = useState(false)
  const [popup, setPopup] = useState('')

  const notify = (msg) => setPopup(msg)

  async function refreshInfo() {
    setChecking(true)
    try {
      setInfo(await getBackupInfo())
    } catch {
      // Not signed in yet, or no backup — leave info null, don't nag on load.
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => { refreshInfo() }, [])

  async function handleBackup() {
    setBusy('backup')
    try {
      await backupToDrive()
      await refreshInfo()
      notify('Backup saved to Google Drive')
    } catch (e) {
      notify(`Backup failed: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  async function handleRestore() {
    setConfirming(false)
    setBusy('restore')
    try {
      await restoreFromDrive()
      notify('Data restored from your latest backup')
    } catch (e) {
      notify(`Restore failed: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const last = info?.latest?.createdTime ? new Date(info.latest.createdTime).toLocaleString() : null

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-medium">Backup &amp; Restore</h1>
      <p className="mb-6 text-sm text-gray-400">
        Your data lives on this device. Back it up to a private folder in your Google
        Drive so you can recover it on a new phone.
      </p>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <p className="text-sm text-gray-400">
          {checking
            ? 'Checking Drive...'
            : last
              ? `Last backed up: ${last}${info.count > 1 ? ` (${info.count} versions kept)` : ''}`
              : 'No backup found yet.'}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            disabled={busy !== null}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            {busy === 'backup' ? 'Backing up...' : 'Back up now'}
          </button>

          <button
            onClick={() => setConfirming(true)}
            disabled={busy !== null}
            className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {busy === 'restore' ? 'Restoring...' : 'Restore from Drive'}
          </button>
        </div>

        {confirming && (
          <div className="mt-5 rounded-md border border-yellow-700/50 bg-gray-950 p-4">
            <p className="text-sm text-gray-300">
              Restoring replaces everything currently on this device with the data from
              your latest Drive backup. This cannot be undone.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleRestore}
                className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-500"
              >
                Replace my data
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <Popup show={!!popup} onClose={() => setPopup('')}>
        <span className="text-sm text-gray-100">{popup}</span>
      </Popup>
    </div>
  )
}
