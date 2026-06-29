import { createContext, useContext, useState } from 'react'
import { post } from '../api/index.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  })

  function persist(data) {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
  }

  async function login(username, password) {
    persist(await post('/auth/login', { username, password }))
  }

  async function register(username, password) {
    persist(await post('/auth/register', { username, password }))
  }

  async function changePassword(currentPassword, newPassword) {
    // Server bumps token_version (logging out other devices) and returns a fresh
    // token for this device so we stay logged in here.
    const data = await post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
  }

  async function logoutEverywhere() {
    try { await post('/auth/logout-all', {}) } catch { /* token already invalid is fine */ }
    logout()
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, changePassword, logoutEverywhere, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Convenience for pages that just need the current user's id.
export function useUserId() {
  return useContext(AuthContext)?.user?.id
}
