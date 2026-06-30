// Google access-token provider for Drive backup.
//
// Two runtimes share this app:
//   - Browser / PWA: Google Identity Services (GIS) token client. Pure web, no plugin.
//   - Native Android (Capacitor): GIS inside a WebView is rejected by Google
//     ("disallowed_useragent"), so a native sign-in plugin must supply the token.
//     That path is stubbed at the bottom and slots in once the APK build works.
//
// We request ONLY the `drive.appdata` scope: the app can read/write its own hidden
// folder in the user's Drive and nothing else. Backups stay out of "My Drive" and
// the consent screen is far less alarming than full-Drive access.

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GIS_SRC = 'https://accounts.google.com/gsi/client'

// True when running inside the Capacitor native shell rather than a plain browser.
const isNative = () => !!window.Capacitor?.isNativePlatform?.()

// Lazy-load the GIS script once, on first use.
let gisReady
function loadGis() {
  if (gisReady) return gisReady
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Google Identity Services'))
    document.head.appendChild(s)
  })
  return gisReady
}

// Browser flow: returns a short-lived OAuth access token (~1h). Pops Google consent
// the first time; afterwards GIS can often return a token without re-prompting.
async function getWebAccessToken() {
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error))
        else resolve(resp.access_token)
      },
      // GIS sends popup-level failures (access_denied, popup_closed, popup blocked)
      // here, NOT to `callback`. Without this the promise would hang forever.
      error_callback: (err) => {
        reject(new Error(err?.type || err?.message || 'Google sign-in was cancelled or blocked'))
      },
    })
    client.requestAccessToken()
  })
}

// Native flow placeholder. Wire a Capacitor Google-auth plugin here once the Android
// build produces APKs; it should return an access token carrying the appdata scope.
async function getNativeAccessToken() {
  throw new Error('Native Google sign-in is not wired up yet')
}

// The single entry point the backup layer calls.
export async function getAccessToken() {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set (see .env.example)')
  return isNative() ? getNativeAccessToken() : getWebAccessToken()
}
