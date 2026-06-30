// Drive backup/restore for the on-device store.
//
// Uses the Drive REST API directly with a short-lived token from googleAuth.js.
// Everything lives in the hidden `appDataFolder`. We keep VERSIONED backups: each
// backup is a new timestamped file, we retain the latest KEEP and prune older ones,
// and restore always reads the newest. That way one bad/partial backup can't clobber
// the whole history. DB serialization is owned by local/db.js (exportAll/importAll).

import { exportAll, importAll, hasUserData } from '../local/db.js'
import { getAccessToken } from './googleAuth.js'

const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const PREFIX = 'thegymessential-backup-'
const KEEP = 10

// Thin fetch wrapper that attaches the bearer token and turns non-2xx into throws.
async function authed(token, url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`)
  return res
}

// All backup files in appDataFolder, newest first.
async function listBackups(token) {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name contains '${PREFIX}' and trashed = false`,
    fields: 'files(id, name, createdTime, modifiedTime)',
    orderBy: 'createdTime desc',
    pageSize: '100',
  })
  const res = await authed(token, `${FILES}?${params}`)
  const { files } = await res.json()
  return files || []
}

// Back up the whole local DB to Drive as a new versioned file, then prune to KEEP.
// Refuses to run on an empty DB so a fresh install can't wipe out cloud history.
export async function backupToDrive() {
  if (!(await hasUserData())) {
    throw new Error('Nothing to back up yet — log a workout first')
  }
  const token = await getAccessToken()
  const dump = await exportAll()
  const body = JSON.stringify(dump)

  // Timestamped, lexically sortable name (colons/dots aren't ideal in filenames).
  const stamp = dump.exported_at.replace(/[:.]/g, '-')
  const name = `${PREFIX}${stamp}.json`

  // Multipart create: metadata + content in one request.
  const boundary = '-------gymessential-backup-boundary'
  const metadata = { name, parents: ['appDataFolder'] }
  const multipart =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${body}\r\n` +
    `--${boundary}--`
  await authed(token, `${UPLOAD}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  })

  // Prune anything beyond the newest KEEP. Best-effort — a failed delete shouldn't
  // fail the backup that already succeeded.
  const all = await listBackups(token)
  const stale = all.slice(KEEP)
  for (const f of stale) {
    try {
      await authed(token, `${FILES}/${f.id}`, { method: 'DELETE' })
    } catch { /* ignore prune failures */ }
  }
  return { name, kept: Math.min(all.length, KEEP), pruned: stale.length }
}

// Pull the NEWEST backup and REPLACE all local data with it. Destructive — the
// caller is expected to confirm with the user first.
export async function restoreFromDrive() {
  const token = await getAccessToken()
  const all = await listBackups(token)
  if (!all.length) throw new Error('No backup found in your Drive')
  const res = await authed(token, `${FILES}/${all[0].id}?alt=media`)
  const dump = await res.json()
  await importAll(dump)
  return { exported_at: dump?.exported_at }
}

// Metadata-only probe for the UI. Null if nothing yet; otherwise the newest file
// plus how many versions are stored.
export async function getBackupInfo() {
  const token = await getAccessToken()
  const all = await listBackups(token)
  return all.length ? { latest: all[0], count: all.length } : null
}
