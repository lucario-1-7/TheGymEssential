import { createContext, useContext } from 'react'

// The app is local/single-user now — no accounts, no login. We keep this context
// so pages can still call useUserId() for path-building, but it's a fixed identity.
const LOCAL_USER = { id: 'local', name: 'Me' }

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ user: LOCAL_USER, token: 'local' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function useUserId() {
  return LOCAL_USER.id
}
