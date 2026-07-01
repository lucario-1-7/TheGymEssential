import { Capacitor } from '@capacitor/core'

// Haptic feedback. Native-only; no-ops in the browser/PWA. The plugin is loaded
// lazily so it stays out of the web bundle's critical path.
async function load() {
  if (!Capacitor.isNativePlatform?.()) return null
  try { return await import('@capacitor/haptics') } catch { return null }
}

const wait = (ms) => new Promise(r => setTimeout(r, ms))

// Gentle tap, e.g. when a set is logged.
export async function tapLight() {
  const m = await load()
  if (!m) return
  try { await m.Haptics.impact({ style: m.ImpactStyle.Light }) } catch {}
}

// Celebratory pattern for a PR: two strong beats then a success buzz, so it feels
// like a congratulation rather than a plain tap.
export async function celebrate() {
  const m = await load()
  if (!m) return
  const { Haptics, ImpactStyle, NotificationType } = m
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy })
    await wait(110)
    await Haptics.impact({ style: ImpactStyle.Heavy })
    await wait(110)
    await Haptics.notification({ type: NotificationType.Success })
  } catch {}
}
