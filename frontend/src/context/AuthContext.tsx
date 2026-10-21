import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import { SESSION_KEY, TOKEN_KEY } from '../api/client'
import { isRole } from '../lib/roles'
import { AuthContext } from './auth'
import type { Session } from './auth'

interface JwtClaims {
  sub?: string
  role?: string
  paciente_id?: number | string | null
  exp?: number
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
}

function decodeSession(token: string): Session {
  const claims = jwtDecode<JwtClaims>(token)
  const role = claims.role ?? ''
  if (!claims.sub || !isRole(role) || !claims.exp) {
    throw new Error('La sesión no contiene los datos necesarios.')
  }
  if (claims.exp * 1000 <= Date.now()) {
    throw new Error('La sesión ya venció. Inicia sesión de nuevo.')
  }
  const rawPacienteId = claims.paciente_id
  const pacienteId =
    typeof rawPacienteId === 'number'
      ? rawPacienteId
      : typeof rawPacienteId === 'string' && rawPacienteId.trim() !== ''
        ? Number(rawPacienteId)
        : null

  return {
    token,
    username: claims.sub,
    role,
    paciente_id: Number.isFinite(pacienteId) ? pacienteId : null,
    exp: claims.exp,
  }
}

function readStoredSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Session
    if (!parsed.token || !parsed.username || !isRole(parsed.role) || !parsed.exp) {
      clearStoredSession()
      return null
    }
    if (parsed.exp * 1000 <= Date.now()) {
      clearStoredSession()
      return null
    }
    return parsed
  } catch {
    clearStoredSession()
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  const logout = useCallback(() => {
    clearStoredSession()
    setSession(null)
  }, [])

  const login = useCallback((token: string) => {
    const nextSession = decodeSession(token)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return nextSession
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }
    const remaining = session.exp * 1000 - Date.now()
    const timer = window.setTimeout(logout, Math.max(0, Math.min(remaining, 2_147_483_647)))
    return () => window.clearTimeout(timer)
  }, [session, logout])

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
