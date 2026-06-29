import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password)
      // AuthProvider state flips token → App renders the app shell.
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <Card className="bg-gray-900 border-gray-800 w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">TheGymEssential</CardTitle>
          <p className="text-sm text-gray-500">
            {mode === 'login' ? 'Log in to continue' : 'Create your account'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? '...' : mode === 'login' ? 'Log in' : 'Register'}
            </Button>
          </form>
          <button
            onClick={() => { setMode(m => (m === 'login' ? 'register' : 'login')); setError('') }}
            className="text-xs text-blue-400 hover:text-blue-300 mt-4 w-full text-center"
          >
            {mode === 'login' ? "No account? Register" : 'Have an account? Log in'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
