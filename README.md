# TheGymEssential

A local-first workout logger built around one idea: progressive overload. Log your
sets, see what you lifted last time, and track volume and strength over time. No
account, no server, no subscription. Your data stays on your device and you can back
it up to your own Google Drive.

## Features

- **Session logging** with planned-vs-actual sets, warm-up and unilateral (left/right) tracking, and RIR/RPE.
- **Workout programs and outlines** with a weekly schedule and per-exercise targets.
- **Last-time reference** on the dashboard so you know what to beat this session.
- **Progress charts** per exercise (estimated 1RM and more) with plateau detection, powered by Recharts.
- **Per-muscle volume tracker** for the week or all time.
- **Bodyweight tracking** with a trend chart.
- **Missed-session prompts** to keep you honest about skipped training days.
- **Google Drive backup and restore**, versioned (last 10 kept) in a private app folder, with a first-launch restore-or-start-fresh screen.
- **Dark UI** with a near-black theme and a single violet accent, a desktop sidebar, and a mobile bottom tab bar.

## Tech

- React 19 + Vite, React Router
- Tailwind CSS + shadcn/ui components, Geist font, lucide icons
- Dexie (IndexedDB) as the on-device store, so the app runs fully offline
- Recharts for charts, Motion (Framer Motion) for light transitions
- Capacitor for the Android build

The app is local-first: `frontend/src/api` dispatches to an on-device store in
`frontend/src/local` (Dexie/IndexedDB) rather than a server, so there is no auth and
no network dependency. A FastAPI + Postgres backend still lives in `backend/` from an
earlier version but is deprecated and unused.

## Getting started

```bash
cd frontend
npm install
npm run dev      # start the dev server at http://localhost:5173
npm run build    # production build into dist/
```

### Google Drive backup (optional)

Backup uses an in-app Google sign-in scoped to `drive.appdata` only, so the app can
see just its own backup folder and nothing else in your Drive. To enable it:

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project and enable the Google Drive API.
2. Configure the OAuth consent screen (External), add the `https://www.googleapis.com/auth/drive.appdata` scope, and add yourself as a test user.
3. Create an OAuth client ID of type Web application, with `http://localhost:5173` as an authorized JavaScript origin.
4. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_GOOGLE_CLIENT_ID` to your client ID.

The browser and PWA path is wired up. Native Google sign-in for the Android build is
not connected yet.

## Android (Capacitor)

The Android build targets Capacitor 8 and compiles against JDK 21.

```bash
cd frontend
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # with JDK 21 on JAVA_HOME
```

The resulting APK is at `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
