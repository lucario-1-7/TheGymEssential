// Google access-token provider for Drive backup.
//
// Two runtimes share this app:
//   - Browser / PWA: Google Identity Services (GIS) token client. Pure web, no plugin.
//   - Native Android (Capacitor): GIS inside a WebView is rejected by Google
//     ("disallowed_useragent"). Instead we run the OAuth flow in the system browser
//     (Chrome Custom Tab) with PKCE and capture the redirect via a custom URI scheme,
//     which is Google's recommended pattern for native apps (RFC 8252).
//
// We request ONLY the `drive.appdata` scope: the app can read/write its own hidden
// folder in the user's Drive and nothing else.

import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GIS_SRC = 'https://accounts.google.com/gsi/client'

// Native (Android) OAuth client and the custom-scheme redirect it uses.
// Google requires installed-app redirects to use the REVERSED client-id scheme,
// e.g. com.googleusercontent.apps.<id>:/oauth2redirect (a package-name scheme is
// rejected with invalid_request). The Android manifest must register this exact
// scheme; we derive it from the client id here so the two stay in sync.
const ANDROID_CLIENT_ID = import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID
const REDIRECT_SCHEME = `com.googleusercontent.apps.${(ANDROID_CLIENT_ID || '').replace('.apps.googleusercontent.com', '')}`
const REDIRECT_URI = `${REDIRECT_SCHEME}:/oauth2redirect`
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REFRESH_KEY = 'google_refresh_token'

// True when running inside the Capacitor native shell rather than a plain browser.
const isNative = () => !!window.Capacitor?.isNativePlatform?.()

// ----------------------------------------------------------------------------
// Web (browser / PWA) flow: Google Identity Services token client.
// ----------------------------------------------------------------------------

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

// Returns a short-lived OAuth access token (~1h). Pops Google consent the first time;
// afterwards GIS can often return a token without re-prompting.
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

// ----------------------------------------------------------------------------
// Native (Android) flow: system-browser OAuth with PKCE.
// ----------------------------------------------------------------------------

function base64Url(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier() {
  const arr = new Uint8Array(64)
  crypto.getRandomValues(arr)
  return base64Url(arr)
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

// Open the consent page in the system browser and resolve with the auth code once
// Google redirects back to our custom scheme. One-shot listener with a timeout.
async function authorizeInBrowser() {
  const verifier = randomVerifier()
  const challenge = await challengeFor(verifier)
  const params = new URLSearchParams({
    client_id: ANDROID_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  const codePromise = new Promise((resolve, reject) => {
    let handle
    const timer = setTimeout(() => {
      handle?.remove?.()
      reject(new Error('Sign-in timed out'))
    }, 5 * 60 * 1000)

    App.addListener('appUrlOpen', (event) => {
      if (!event.url?.startsWith(REDIRECT_URI)) return
      clearTimeout(timer)
      handle?.remove?.()
      Browser.close().catch(() => {})
      const q = event.url.indexOf('?')
      const sp = new URLSearchParams(q >= 0 ? event.url.slice(q + 1) : '')
      const err = sp.get('error')
      const code = sp.get('code')
      if (err) reject(new Error(err))
      else if (code) resolve(code)
      else reject(new Error('No authorization code in redirect'))
    }).then(h => { handle = h })
  })

  await Browser.open({ url: `${AUTH_ENDPOINT}?${params}` })
  return { code: await codePromise, verifier }
}

async function postToken(body) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function exchangeCode(code, verifier) {
  return postToken(new URLSearchParams({
    client_id: ANDROID_CLIENT_ID,
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  }))
}

async function refreshAccessToken(refresh) {
  return postToken(new URLSearchParams({
    client_id: ANDROID_CLIENT_ID,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  }))
}

async function getNativeAccessToken() {
  if (!ANDROID_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_ANDROID_CLIENT_ID is not set (see .env.example)')
  }

  // Try a silent refresh first so the user only signs in once.
  const { value: stored } = await Preferences.get({ key: REFRESH_KEY })
  if (stored) {
    try {
      const tok = await refreshAccessToken(stored)
      if (tok.refresh_token) await Preferences.set({ key: REFRESH_KEY, value: tok.refresh_token })
      return tok.access_token
    } catch {
      // Refresh token revoked or expired: fall through to a full sign-in.
    }
  }

  const { code, verifier } = await authorizeInBrowser()
  const tok = await exchangeCode(code, verifier)
  if (tok.refresh_token) await Preferences.set({ key: REFRESH_KEY, value: tok.refresh_token })
  return tok.access_token
}

// ----------------------------------------------------------------------------

// The single entry point the backup layer calls.
export async function getAccessToken() {
  if (isNative()) return getNativeAccessToken()
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set (see .env.example)')
  return getWebAccessToken()
}
