import { createContext, useContext } from 'react'
import type { Role } from '../lib/roles'

export interface Session {
  token: string
  username: string
  role: Role
  paciente_id: number | null
  exp: number
}

export interface AuthContextValue {
  session: Session | null
  login: (token: string) => Session
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
