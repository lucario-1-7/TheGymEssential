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

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
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
