import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Brand } from '../components/Brand'
import { Icon } from '../components/Icon'
import { useAuth } from '../context/auth'
import { getApiError } from '../lib/format'
import { homePathForRole, ROLE_LABELS } from '../lib/roles'
import type { StaffRole } from '../lib/roles'
import './Login.css'

type AuthTab = 'login' | 'request' | 'register'

const REQUEST_ROLES: StaffRole[] = ['medico', 'bacteriologo', 'farmaceutico', 'cajero', 'gerencia']

export function Login() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AuthTab>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginPending, setLoginPending] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestPending, setRequestPending] = useState(false)
  const [requestId, setRequestId] = useState<number | null>(null)
  const [registerError, setRegisterError] = useState('')
  const [registerPending, setRegisterPending] = useState(false)

  if (session) {
    return <Navigate to={homePathForRole(session.role)} replace />
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoginPending(true)
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const body = new FormData()
      body.set('username', String(formData.get('username') ?? '').trim())
      body.set('password', String(formData.get('password') ?? ''))
      const { data } = await api.post<{ access_token: string; token_type: string; role: string }>(
        '/auth/login',
        body,
      )
      const nextSession = login(data.access_token)
      navigate(homePathForRole(nextSession.role), { replace: true })
    } catch (error) {
      setLoginError(getApiError(error))
      form.querySelector<HTMLInputElement>('input[name="password"]')?.focus()
    } finally {
      setLoginPending(false)
    }
  }

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestError('')
    setRequestPending(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get('email') ?? '').trim()
    const telefono = String(formData.get('telefono') ?? '').trim()
    const motivo = String(formData.get('motivo') ?? '').trim()

    try {
      const { data } = await api.post<{ id: number; estado: string }>('/auth/solicitudes', {
        nombre: String(formData.get('nombre') ?? '').trim(),
        documento: String(formData.get('documento') ?? '').trim(),
        email: email || null,
        telefono: telefono || null,
        rol_solicitado: String(formData.get('rol_solicitado') ?? ''),
        motivo: motivo || null,
      })
      setRequestId(data.id)
      form.reset()
    } catch (error) {
      setRequestError(getApiError(error))
    } finally {
      setRequestPending(false)
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterError('')
    setRegisterPending(true)
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const { data } = await api.post<{ access_token: string; token_type: string; role: string }>(
        '/auth/registro-paciente',
        {
          nombre: String(formData.get('nombre') ?? '').trim(),
          documento: String(formData.get('documento') ?? '').trim(),
          telefono: String(formData.get('telefono') ?? '').trim(),
          email: String(formData.get('email') ?? '').trim(),
          password: String(formData.get('password') ?? ''),
          confirmar_password: String(formData.get('confirmar_password') ?? ''),
        },
      )
      const nextSession = login(data.access_token)
      navigate('/paciente', { replace: true })
      void nextSession.role
    } catch (error) {
      setRegisterError(getApiError(error))
      form.querySelector<HTMLInputElement>('input[name="documento"]')?.focus()
    } finally {
      setRegisterPending(false)
    }
  }

  const switchTab = (next: AuthTab) => {
    setTab(next)
    setLoginError('')
    setRequestError('')
    setRegisterError('')
    setRequestId(null)
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="auth-story-inner">
          <Brand homePath="/login" tone="light" />

          <div className="story-copy">
            <p className="eyebrow eyebrow-light">
              <span className="eyebrow-rule" aria-hidden="true" />
              SaludDigital
            </p>
            <h1>Tu información clínica, clara y a la mano.</h1>
            <p className="story-lead">
              Citas, resultados y procesos de atención reunidos en un espacio seguro para
              pacientes y equipos de salud.
            </p>
            <ul className="story-points">
              <li>
                <span className="point-check">
                  <Icon name="check" size={15} />
                </span>
                Consulta tus citas y resultados
              </li>
              <li>
                <span className="point-check">
                  <Icon name="check" size={15} />
                </span>
                Acceso protegido según tu rol
              </li>
              <li>
                <span className="point-check">
                  <Icon name="check" size={15} />
                </span>
                Información clínica actualizada
              </li>
            </ul>
          </div>

          <div className="story-preview" aria-hidden="true">
            <div className="preview-head">
              <span className="preview-eyebrow">Mi salud</span>
              <span className="preview-date">Hoy</span>
            </div>
            <div className="preview-appointment">
              <span className="preview-icon preview-icon-solid">
                <Icon name="calendar" size={18} />
              </span>
              <div>
                <span className="preview-label">Próxima cita</span>
                <strong>Medicina general</strong>
                <span className="preview-meta">Hoy · 10:30 a. m.</span>
              </div>
              <span className="status-chip status-chip-blue">Agendada</span>
            </div>
            <div className="preview-result">
              <span className="preview-icon">
                <Icon name="flask" size={18} />
              </span>
              <div>
                <span className="preview-label">Resultado de laboratorio</span>
                <strong>Hemograma completo</strong>
              </div>
              <span className="preview-ready">
                <Icon name="check" size={14} />
                Listo
              </span>
            </div>
            <span className="preview-orbit preview-orbit-one" />
            <span className="preview-orbit preview-orbit-two" />
          </div>

          <p className="story-foot">Información protegida · Uso exclusivo del sistema de salud</p>
        </div>
      </section>

      <section className="auth-access">
        <div className="auth-access-top">
          <span className="secure-label">
            <Icon name="shield" size={16} />
            Acceso seguro
          </span>
          <Brand compact homePath="/login" />
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <p className="eyebrow">Bienvenido</p>
            <h2>
              {tab === 'login'
                ? 'Ingresa a tu cuenta'
                : tab === 'register'
                  ? 'Crea tu cuenta de paciente'
                  : 'Solicita acceso'}
            </h2>
            <p>
              {tab === 'login'
                ? 'Usa las credenciales asignadas por tu institución.'
                : tab === 'register'
                  ? 'Regístrate con tu documento y obtén acceso inmediato a tu portal.'
                  : 'Un administrador revisará tu solicitud antes de habilitar la cuenta.'}
            </p>
          </div>

          <div className="auth-tabs" role="group" aria-label="Opciones de acceso">
            <button
              aria-pressed={tab === 'login'}
              className={tab === 'login' ? 'auth-tab is-active' : 'auth-tab'}
              onClick={() => switchTab('login')}
              type="button"
            >
              Ingresar
            </button>
            <button
              aria-pressed={tab === 'register'}
              className={tab === 'register' ? 'auth-tab is-active' : 'auth-tab'}
              onClick={() => switchTab('register')}
              type="button"
            >
              Registro Paciente
            </button>
            <button
              aria-pressed={tab === 'request'}
              className={tab === 'request' ? 'auth-tab is-active' : 'auth-tab'}
              onClick={() => switchTab('request')}
              type="button"
            >
              Solicitar Cuenta
            </button>
          </div>

          {tab === 'register' ? (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="field">
                <label htmlFor="register-name">Nombre completo</label>
                <div className="input-shell">
                  <Icon name="user" size={19} />
                  <input autoComplete="name" id="register-name" minLength={2} name="nombre" placeholder="Nombre y apellidos" required type="text" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="register-document">Documento</label>
                  <div className="input-shell">
                    <Icon name="shield" size={19} />
                    <input autoComplete="off" id="register-document" inputMode="numeric" minLength={5} name="documento" pattern="[0-9]{5,12}" placeholder="Número de documento" required title="5 a 12 dígitos" type="text" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="register-phone">Teléfono</label>
                  <div className="input-shell">
                    <Icon name="user" size={19} />
                    <input autoComplete="tel" id="register-phone" inputMode="numeric" name="telefono" pattern="[0-9]{7,10}" placeholder="Número de contacto" required title="7 a 10 dígitos" type="tel" />
                  </div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="register-email">Correo electrónico</label>
                <div className="input-shell">
                  <Icon name="mail" size={19} />
                  <input autoComplete="email" id="register-email" name="email" placeholder="nombre@correo.com" required type="email" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="register-password">Contraseña</label>
                <div className="input-shell">
                  <Icon name="lock" size={19} />
                  <input autoComplete="new-password" id="register-password" minLength={6} name="password" placeholder="Mínimo 6 caracteres" required type={showPassword ? 'text' : 'password'} />
                  <button aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="field-action" onClick={() => setShowPassword((value) => !value)} type="button">
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="register-confirm">Confirmar contraseña</label>
                <div className="input-shell">
                  <Icon name="lock" size={19} />
                  <input autoComplete="new-password" id="register-confirm" minLength={6} name="confirmar_password" placeholder="Repite la contraseña" required type={showPassword ? 'text' : 'password'} />
                </div>
              </div>
              {registerError && (
                <p className="form-message form-message-error" role="alert">
                  <Icon name="alert" size={18} />
                  {registerError}
                </p>
              )}
              <button className="button button-primary button-wide" disabled={registerPending} type="submit">
                {registerPending ? 'Creando cuenta…' : 'Crear cuenta'}
                {!registerPending && <Icon name="arrow-right" size={19} />}
              </button>
            </form>
          ) : tab === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="login-username">Usuario</label>
                <div className="input-shell">
                  <Icon name="user" size={19} />
                  <input
                    autoComplete="username"
                    id="login-username"
                    name="username"
                    placeholder="Tu usuario institucional"
                    required
                    type="text"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="login-password">Contraseña</label>
                <div className="input-shell">
                  <Icon name="lock" size={19} />
                  <input
                    autoComplete="current-password"
                    id="login-password"
                    minLength={1}
                    name="password"
                    placeholder="Tu contraseña"
                    required
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="field-action"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="form-message form-message-error" role="alert">
                  <Icon name="alert" size={18} />
                  {loginError}
                </p>
              )}

              <button className="button button-primary button-wide" disabled={loginPending} type="submit">
                {loginPending ? 'Verificando…' : 'Iniciar sesión'}
                {!loginPending && <Icon name="arrow-right" size={19} />}
              </button>

              <p className="form-note">
                <Icon name="lock" size={15} />
                Tu sesión se cierra automáticamente al vencer el token de seguridad.
              </p>
            </form>
          ) : requestId ? (
            <div className="request-success" role="status">
              <span className="success-mark">
                <Icon name="check" size={26} />
              </span>
              <h3>Solicitud enviada</h3>
              <p>
                Registramos tu solicitud <strong>#{requestId}</strong>. El equipo administrativo
                revisará la información y te contactará cuando la cuenta esté habilitada.
              </p>
              <button className="button button-secondary button-wide" onClick={() => switchTab('login')} type="button">
                Volver a ingresar
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleRequest}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="request-name">Nombre completo</label>
                  <input
                    autoComplete="name"
                    id="request-name"
                    minLength={2}
                    name="nombre"
                    placeholder="Nombre y apellidos"
                    required
                    type="text"
                  />
                </div>
                <div className="field">
                  <label htmlFor="request-document">Documento</label>
                  <input
                    autoComplete="off"
                    id="request-document"
                    minLength={5}
                    name="documento"
                    placeholder="Número de documento"
                    required
                    type="text"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="request-email">Correo electrónico</label>
                  <input
                    autoComplete="email"
                    id="request-email"
                    name="email"
                    placeholder="nombre@correo.com"
                    type="email"
                  />
                </div>
                <div className="field">
                  <label htmlFor="request-phone">Teléfono</label>
                  <input
                    autoComplete="tel"
                    id="request-phone"
                    name="telefono"
                    placeholder="Número de contacto"
                    type="tel"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="request-role">Rol solicitado</label>
                <div className="select-shell">
                  <Icon name="users" size={19} />
                  <select defaultValue="medico" id="request-role" name="rol_solicitado" required>
                    {REQUEST_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="request-reason">Motivo de la solicitud</label>
                <textarea
                  id="request-reason"
                  maxLength={500}
                  name="motivo"
                  placeholder="Cuéntanos brevemente por qué necesitas acceso."
                  rows={3}
                />
              </div>

              {requestError && (
                <p className="form-message form-message-error" role="alert">
                  <Icon name="alert" size={18} />
                  {requestError}
                </p>
              )}

              <button className="button button-primary button-wide" disabled={requestPending} type="submit">
                {requestPending ? 'Enviando…' : 'Enviar solicitud'}
                {!requestPending && <Icon name="arrow-right" size={19} />}
              </button>
            </form>
          )}
        </div>

        <p className="access-foot">SaludDigital · Arquitectura empresarial de salud</p>
      </section>
    </div>
  )
}
