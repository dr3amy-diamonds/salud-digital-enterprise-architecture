import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { Feedback } from '../../components/staff/Feedback'
import { ModulePage } from '../../components/staff/ModulePage'
import type { SolicitudAcceso, Usuario } from '../../lib/apiTypes'
import { formatDateTime, getApiError } from '../../lib/format'
import { ROLE_LABELS, STAFF_ROLES, isStaffRole } from '../../lib/roles'
import { useApiList } from '../../lib/useApiList'
import './UsuariosView.css'

type Message = { tone: 'success' | 'error'; text: string } | null
type Tab = 'solicitudes' | 'usuarios'

const EMPTY_USER = { username: '', password: '', role: 'medico' }

export function UsuariosView() {
  const [params, setParams] = useSearchParams()
  const solicitudes = useApiList<SolicitudAcceso>('/auth/solicitudes')
  const usuarios = useApiList<Usuario>('/auth/usuarios')
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [approving, setApproving] = useState<SolicitudAcceso | null>(null)
  const [approveForm, setApproveForm] = useState({ username: '', password: '', role: 'medico' })
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [newUser, setNewUser] = useState(EMPTY_USER)
  const [resetUser, setResetUser] = useState<Usuario | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  const tab: Tab = params.get('vista') === 'usuarios' ? 'usuarios' : 'solicitudes'

  const setTab = (next: Tab) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('vista', next)
    setParams(nextParams, { replace: true })
    setMessage(null)
  }

  const startApprove = (solicitud: SolicitudAcceso) => {
    const suggested = solicitud.email?.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') ?? ''
    setApproving(solicitud)
    setRejectingId(null)
    setMessage(null)
    setApproveForm({
      username: suggested,
      password: '',
      role:
        isStaffRole(solicitud.rol_solicitado) && solicitud.rol_solicitado !== 'admin'
          ? solicitud.rol_solicitado
          : 'medico',
    })
  }

  const handleApprove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!approving) {
      return
    }
    setMessage(null)
    setPending('approve')
    try {
      await api.post('/auth/usuarios/aprobar', {
        solicitud_id: approving.id,
        username: approveForm.username.trim(),
        password: approveForm.password,
        role: approveForm.role,
      })
      setMessage({ tone: 'success', text: `Solicitud #${approving.id} aprobada y cuenta creada.` })
      setApproving(null)
      setApproveForm({ username: '', password: '', role: 'medico' })
      await Promise.all([solicitudes.reload(), usuarios.reload()])
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleReject = async (solicitudId: number) => {
    setMessage(null)
    setPending(`reject-${solicitudId}`)
    try {
      await api.post(`/auth/solicitudes/${solicitudId}/rechazar`)
      setRejectingId(null)
      setMessage({ tone: 'success', text: `Solicitud #${solicitudId} rechazada.` })
      await solicitudes.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setPending('create')
    try {
      await api.post('/auth/usuarios', {
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
      })
      setMessage({ tone: 'success', text: 'Usuario institucional creado.' })
      setNewUser(EMPTY_USER)
      await usuarios.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleRole = async (usuario: Usuario, role: string) => {
    setMessage(null)
    setPending(`role-${usuario.id}`)
    try {
      await api.patch(`/auth/usuarios/${usuario.id}/rol`, { role })
      setMessage({ tone: 'success', text: `Rol de ${usuario.username} actualizado.` })
      await usuarios.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleState = async (usuario: Usuario) => {
    setMessage(null)
    setPending(`state-${usuario.id}`)
    try {
      await api.patch(`/auth/usuarios/${usuario.id}/estado`, { is_active: !usuario.is_active })
      setMessage({
        tone: 'success',
        text: `${usuario.username} quedó ${usuario.is_active ? 'desactivado' : 'activo'}.`,
      })
      await usuarios.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetUser) {
      return
    }
    setMessage(null)
    setPending('reset')
    try {
      await api.post(`/auth/usuarios/${resetUser.id}/reset-password`, { nueva: resetPassword })
      setMessage({ tone: 'success', text: `Clave de ${resetUser.username} actualizada.` })
      setResetUser(null)
      setResetPassword('')
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const pendingSolicitudes = solicitudes.data.filter((solicitud) => solicitud.estado === 'Pendiente')

  return (
    <ModulePage
      description="Revisa solicitudes de acceso, crea cuentas y administra roles. Las cuentas de paciente se gestionan fuera de este panel."
      icon="users"
      kicker="Módulo 06 · Usuarios"
      title="Cuentas y permisos"
    >
      <div className="users-tabs" role="group" aria-label="Vistas de administración">
        <button
          aria-pressed={tab === 'solicitudes'}
          className={tab === 'solicitudes' ? 'view-tab is-active' : 'view-tab'}
          onClick={() => setTab('solicitudes')}
          type="button"
        >
          Solicitudes
          <span>{pendingSolicitudes.length}</span>
        </button>
        <button
          aria-pressed={tab === 'usuarios'}
          className={tab === 'usuarios' ? 'view-tab is-active' : 'view-tab'}
          onClick={() => setTab('usuarios')}
          type="button"
        >
          Usuarios
          <span>{usuarios.data.length}</span>
        </button>
      </div>

      {message && <Feedback tone={message.tone}>{message.text}</Feedback>}

      {tab === 'solicitudes' ? (
        <>
          {approving && (
            <section aria-labelledby="approve-title" className="panel approval-panel">
              <div className="panel-head">
                <div>
                  <p className="section-kicker">Aprobación</p>
                  <h2 className="panel-title" id="approve-title">
                    Aprobar solicitud #{approving.id}
                  </h2>
                  <p className="panel-subtitle">
                    {approving.nombre} · {approving.documento}
                  </p>
                </div>
                <button
                  className="button button-quiet button-small"
                  onClick={() => setApproving(null)}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
              <form className="form-stack" onSubmit={handleApprove}>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="approve-username">Usuario</label>
                    <input
                      autoComplete="off"
                      id="approve-username"
                      minLength={3}
                      onChange={(event) =>
                        setApproveForm({ ...approveForm, username: event.target.value })
                      }
                      required
                      spellCheck={false}
                      type="text"
                      value={approveForm.username}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="approve-role">Rol asignado</label>
                    <select
                      id="approve-role"
                      onChange={(event) => setApproveForm({ ...approveForm, role: event.target.value })}
                      value={approveForm.role}
                    >
                      {STAFF_ROLES.filter((role) => role !== 'admin').map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="approve-password">Clave inicial</label>
                  <input
                    autoComplete="new-password"
                    id="approve-password"
                    minLength={6}
                    onChange={(event) =>
                      setApproveForm({ ...approveForm, password: event.target.value })
                    }
                    required
                    type="password"
                    value={approveForm.password}
                  />
                  <span className="form-hint">La persona debe cambiarla al primer ingreso.</span>
                </div>
                <div className="form-actions">
                  <button className="button button-primary" disabled={pending === 'approve'} type="submit">
                    {pending === 'approve' ? 'Aprobando…' : 'Crear cuenta'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section aria-labelledby="requests-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Bandeja</p>
                <h2 className="panel-title" id="requests-title">
                  Solicitudes de acceso
                </h2>
              </div>
              <span className="count-badge">{solicitudes.data.length}</span>
            </div>
            {solicitudes.loading ? (
              <LoadingRows rows={4} tall />
            ) : solicitudes.error ? (
              <ErrorState message={solicitudes.error} onRetry={() => void solicitudes.reload()} />
            ) : solicitudes.data.length === 0 ? (
              <EmptyState icon="users" title="Sin solicitudes">
                Las solicitudes enviadas desde el login aparecerán aquí.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Solicitante</th>
                      <th scope="col">Documento</th>
                      <th scope="col">Rol</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.data.map((solicitud) => (
                      <tr key={solicitud.id}>
                        <td data-label="Solicitante">
                          <span className="cell-strong">{solicitud.nombre}</span>
                          {solicitud.email && <span className="cell-sub">{solicitud.email}</span>}
                        </td>
                        <td className="cell-muted" data-label="Documento">
                          {solicitud.documento}
                        </td>
                        <td data-label="Rol">
                          {ROLE_LABELS[solicitud.rol_solicitado as keyof typeof ROLE_LABELS]}
                        </td>
                        <td className="cell-muted" data-label="Fecha">
                          {formatDateTime(solicitud.fecha_solicitud)}
                        </td>
                        <td data-label="Estado">
                          <span className={`status-chip status-chip-${solicitud.estado === 'Pendiente' ? 'amber' : solicitud.estado === 'Aprobada' ? 'green' : 'red'}`}>
                            {solicitud.estado}
                          </span>
                        </td>
                        <td data-label="Acciones">
                          {solicitud.estado === 'Pendiente' ? (
                            rejectingId === solicitud.id ? (
                              <div className="row-actions">
                                <span className="confirm-label">¿Rechazar?</span>
                                <button
                                  className="button button-small row-danger"
                                  disabled={pending === `reject-${solicitud.id}`}
                                  onClick={() => void handleReject(solicitud.id)}
                                  type="button"
                                >
                                  Sí
                                </button>
                                <button
                                  className="button button-quiet button-small"
                                  onClick={() => setRejectingId(null)}
                                  type="button"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="row-actions">
                                <button
                                  className="button button-secondary button-small"
                                  onClick={() => startApprove(solicitud)}
                                  type="button"
                                >
                                  Aprobar
                                </button>
                                <button
                                  className="button button-quiet button-small"
                                  onClick={() => {
                                    setApproving(null)
                                    setRejectingId(solicitud.id)
                                  }}
                                  type="button"
                                >
                                  Rechazar
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="cell-muted">Revisada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="users-forms">
            <section aria-labelledby="create-user-title" className="panel">
              <div className="panel-head">
                <div>
                  <p className="section-kicker">Alta directa</p>
                  <h2 className="panel-title" id="create-user-title">
                    Crear usuario
                  </h2>
                </div>
              </div>
              <form className="form-stack" onSubmit={handleCreateUser}>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="new-username">Usuario</label>
                    <input
                      autoComplete="off"
                      id="new-username"
                      minLength={3}
                      onChange={(event) => setNewUser({ ...newUser, username: event.target.value })}
                      required
                      spellCheck={false}
                      type="text"
                      value={newUser.username}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="new-role">Rol</label>
                    <select
                      id="new-role"
                      onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
                      value={newUser.role}
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="new-password">Clave inicial</label>
                  <input
                    autoComplete="new-password"
                    id="new-password"
                    minLength={6}
                    onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                    required
                    type="password"
                    value={newUser.password}
                  />
                </div>
                <div className="form-actions">
                  <button className="button button-primary" disabled={pending === 'create'} type="submit">
                    {pending === 'create' ? 'Creando…' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </section>

            {resetUser && (
              <section aria-labelledby="reset-title" className="panel">
                <div className="panel-head">
                  <div>
                    <p className="section-kicker">Seguridad</p>
                    <h2 className="panel-title" id="reset-title">
                      Resetear clave · {resetUser.username}
                    </h2>
                  </div>
                  <button
                    className="button button-quiet button-small"
                    onClick={() => {
                      setResetUser(null)
                      setResetPassword('')
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
                <form className="form-stack" onSubmit={handleReset}>
                  <div className="field">
                    <label htmlFor="reset-password">Nueva clave</label>
                    <input
                      autoComplete="new-password"
                      id="reset-password"
                      minLength={6}
                      onChange={(event) => setResetPassword(event.target.value)}
                      required
                      type="password"
                      value={resetPassword}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="button button-primary" disabled={pending === 'reset'} type="submit">
                      {pending === 'reset' ? 'Actualizando…' : 'Actualizar clave'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>

          <section aria-labelledby="users-list-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Directorio institucional</p>
                <h2 className="panel-title" id="users-list-title">
                  Usuarios
                </h2>
              </div>
              <span className="count-badge">{usuarios.data.length}</span>
            </div>
            <p className="panel-note">
              Las cuentas de paciente no se crean aquí. Requieren vinculación con un expediente y
              ese flujo aún no está disponible en la API.
            </p>
            {usuarios.loading ? (
              <LoadingRows rows={4} />
            ) : usuarios.error ? (
              <ErrorState message={usuarios.error} onRetry={() => void usuarios.reload()} />
            ) : usuarios.data.length === 0 ? (
              <EmptyState icon="users" title="Sin usuarios">
                Crea la primera cuenta institucional.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Usuario</th>
                      <th scope="col">Rol</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.data.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="cell-strong" data-label="Usuario">
                          {usuario.username}
                        </td>
                        <td data-label="Rol">
                          {usuario.role === 'paciente' ? (
                            <span className="cell-muted">Paciente · cuenta vinculada</span>
                          ) : (
                            <select
                              aria-label={`Rol de ${usuario.username}`}
                              className="role-select"
                              disabled={pending === `role-${usuario.id}`}
                              onChange={(event) => void handleRole(usuario, event.target.value)}
                              value={usuario.role}
                            >
                              {STAFF_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td data-label="Estado">
                          <span
                            className={`status-chip status-chip-${usuario.is_active ? 'green' : 'red'}`}
                          >
                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td data-label="Acciones">
                          <div className="row-actions">
                            <button
                              className="button button-secondary button-small"
                              disabled={pending === `state-${usuario.id}`}
                              onClick={() => void handleState(usuario)}
                              type="button"
                            >
                              {usuario.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              className="button button-quiet button-small"
                              onClick={() => {
                                setResetUser(usuario)
                                setResetPassword('')
                              }}
                              type="button"
                            >
                              Resetear clave
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </ModulePage>
  )
}
