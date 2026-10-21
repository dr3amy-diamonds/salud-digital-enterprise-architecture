import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import api from '../api/client'
import { Icon } from '../components/Icon'
import { PortalHeader } from '../components/PortalHeader'
import { useAuth } from '../context/auth'
import {
  dateParts,
  formatDateTime,
  formatDetailValue,
  getApiError,
  humanizeKey,
  resolveFileUrl,
} from '../lib/format'
import { downloadLabSummary } from '../lib/results'
import type { LabResult } from '../lib/results'
import { ESPECIALIDADES, ESPECIALIDAD_PLACEHOLDER } from '../lib/specialties'
import './PacienteDashboard.css'

interface Cita {
  id: number
  paciente_id: number
  fecha: string
  especialidad: string
  estado: string | null
}

type CitasView = 'proximas' | 'historial'

const CLOSED_STATES = ['cancelada', 'atendida', 'completada']

function isUpcoming(cita: Cita): boolean {
  const date = new Date(cita.fecha)
  const estado = (cita.estado ?? '').toLowerCase()
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now() && !CLOSED_STATES.includes(estado)
}

function statusTone(estado: string | null): string {
  const value = (estado ?? 'sin estado').toLowerCase()
  if (value === 'agendada' || value === 'programada') {
    return 'blue'
  }
  if (value === 'atendida' || value === 'completada' || value === 'procesada') {
    return 'green'
  }
  if (value === 'cancelada' || value === 'rechazada') {
    return 'red'
  }
  return 'amber'
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function todayLabel(): string {
  const value = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return capitalize(value)
}

function localDateTimeMin(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

interface ModalShellProps {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}

function ModalShell({ title, description, onClose, children }: ModalShellProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div aria-labelledby="appointment-dialog-title" aria-modal="true" className="modal-card" role="dialog">
        <div className="modal-head">
          <div>
            <p className="section-kicker">Gestión de cita</p>
            <h2 id="appointment-dialog-title">{title}</h2>
            <p className="modal-meta">{description}</p>
          </div>
          <button className="button button-quiet button-small" onClick={onClose} ref={closeButtonRef} type="button">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

async function fetchCitas(): Promise<Cita[]> {
  const { data } = await api.get<Cita[]>('/admision/citas/mis-citas')
  return data
}

async function fetchResultados(): Promise<LabResult[]> {
  const { data } = await api.get<LabResult[]>('/lab/resultados/mis-resultados')
  return data
}

export function PacienteDashboard() {
  const { session } = useAuth()
  const [citas, setCitas] = useState<Cita[]>([])
  const [resultados, setResultados] = useState<LabResult[]>([])
  const [citasLoading, setCitasLoading] = useState(true)
  const [resultadosLoading, setResultadosLoading] = useState(true)
  const [citasError, setCitasError] = useState('')
  const [resultadosError, setResultadosError] = useState('')
  const [citasView, setCitasView] = useState<CitasView>('proximas')
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formPending, setFormPending] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Cita | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Cita | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [actionPending, setActionPending] = useState<'cancel' | 'reschedule' | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const loadCitas = useCallback(async () => {
    setCitasLoading(true)
    setCitasError('')
    try {
      setCitas(await fetchCitas())
    } catch (error) {
      setCitasError(getApiError(error))
    } finally {
      setCitasLoading(false)
    }
  }, [])

  const loadResultados = useCallback(async () => {
    setResultadosLoading(true)
    setResultadosError('')
    try {
      setResultados(await fetchResultados())
    } catch (error) {
      setResultadosError(getApiError(error))
    } finally {
      setResultadosLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.allSettled([fetchCitas(), fetchResultados()]).then(
      ([citasResult, resultadosResult]) => {
        if (!active) {
          return
        }
        if (citasResult.status === 'fulfilled') {
          setCitas(citasResult.value)
        } else {
          setCitasError(getApiError(citasResult.reason))
        }
        if (resultadosResult.status === 'fulfilled') {
          setResultados(resultadosResult.value)
        } else {
          setResultadosError(getApiError(resultadosResult.reason))
        }
        setCitasLoading(false)
        setResultadosLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [])

  const upcoming = citas
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  const history = citas
    .filter((cita) => !isUpcoming(cita))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  const nextCita = upcoming[0]
  const displayedCitas = citasView === 'proximas' ? upcoming : history

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormPending(true)
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await api.post<Cita>('/admision/citas', {
        fecha: String(formData.get('fecha') ?? ''),
        especialidad: String(formData.get('especialidad') ?? '').trim(),
      })
      form.reset()
      setShowForm(false)
      setCitasView('proximas')
      setFormSuccess('Tu cita quedó registrada. Aparecerá en la lista de próximas citas.')
      await loadCitas()
    } catch (error) {
      setFormError(getApiError(error))
    } finally {
      setFormPending(false)
    }
  }

  const closeDialogs = () => {
    if (actionPending) {
      return
    }
    setCancelTarget(null)
    setRescheduleTarget(null)
    setActionError('')
  }

  const openCancel = (cita: Cita) => {
    setRescheduleTarget(null)
    setCancelTarget(cita)
    setActionError('')
    setActionSuccess('')
  }

  const openReschedule = (cita: Cita) => {
    setCancelTarget(null)
    setRescheduleTarget(cita)
    setRescheduleDate('')
    setActionError('')
    setActionSuccess('')
  }

  const handleCancel = async () => {
    if (!cancelTarget) {
      return
    }
    setActionError('')
    setActionPending('cancel')
    try {
      await api.patch<Cita>(`/admision/citas/${cancelTarget.id}/cancelar`)
      setCancelTarget(null)
      setActionSuccess('Cita cancelada. Puedes agendar una nueva cuando la necesites.')
      await loadCitas()
    } catch (error) {
      setActionError(getApiError(error))
    } finally {
      setActionPending(null)
    }
  }

  const handleReschedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!rescheduleTarget) {
      return
    }
    if (!rescheduleDate || new Date(rescheduleDate).getTime() <= Date.now()) {
      setActionError('Elige una fecha y hora futuras.')
      return
    }
    setActionError('')
    setActionPending('reschedule')
    try {
      const { data } = await api.patch<Cita>(`/admision/citas/${rescheduleTarget.id}/reprogramar`, {
        fecha: rescheduleDate,
      })
      setRescheduleTarget(null)
      setActionSuccess(`Cita reprogramada para ${formatDateTime(data.fecha)}.`)
      await loadCitas()
    } catch (error) {
      setActionError(getApiError(error))
    } finally {
      setActionPending(null)
    }
  }

  return (
    <div className="portal-page">
      <PortalHeader context="portal" />
      <main className="portal-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Portal del paciente</p>
            <h1>Tu salud, en orden.</h1>
            <p className="page-subtitle">
              {todayLabel()} · Consulta tus próximas citas y los resultados disponibles.
            </p>
          </div>
          <button
            className={showForm ? 'button button-secondary' : 'button button-primary'}
            onClick={() => {
              setShowForm((value) => !value)
              setFormError('')
            }}
            type="button"
          >
            <Icon name={showForm ? 'chevron' : 'calendar'} size={19} />
            {showForm ? 'Cerrar formulario' : 'Agendar cita'}
          </button>
        </div>

        {formSuccess && (
          <p className="form-message form-message-success" role="status">
            <Icon name="check" size={18} />
            {formSuccess}
          </p>
        )}

        {showForm && (
          <section className="schedule-panel" aria-labelledby="schedule-title">
            <div className="schedule-copy">
              <span className="section-kicker">
                <Icon name="calendar" size={16} />
                Nueva cita
              </span>
              <h2 id="schedule-title">Agenda tu próxima atención</h2>
              <p>Elige la especialidad y la fecha. La cita se crea a nombre del titular de la cuenta.</p>
            </div>
            <form className="schedule-form" onSubmit={handleCreate}>
              <div className="field">
                <label htmlFor="cita-especialidad">Especialidad</label>
                <div className="select-shell">
                  <Icon name="clipboard" size={19} />
                  <select defaultValue="" id="cita-especialidad" name="especialidad" required>
                    <option disabled value="">
                      {ESPECIALIDAD_PLACEHOLDER}
                    </option>
                    {ESPECIALIDADES.map((especialidad) => (
                      <option key={especialidad} value={especialidad}>
                        {especialidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="cita-fecha">Fecha y hora</label>
                <div className="input-shell">
                  <Icon name="clock" size={19} />
                  <input
                    defaultValue=""
                    id="cita-fecha"
                    min={localDateTimeMin()}
                    name="fecha"
                    required
                    type="datetime-local"
                  />
                </div>
              </div>
              <button className="button button-primary" disabled={formPending} type="submit">
                {formPending ? 'Agendando…' : 'Confirmar cita'}
                {!formPending && <Icon name="arrow-right" size={18} />}
              </button>
            </form>
            {formError && (
              <p className="form-message form-message-error schedule-error" role="alert">
                <Icon name="alert" size={18} />
                {formError}
              </p>
            )}
          </section>
        )}

        <section className="patient-overview" aria-label="Resumen de salud">
          <article className="overview-card overview-next">
            <span className="overview-icon">
              <Icon name="calendar" size={22} />
            </span>
            <div className="overview-content">
              <span className="overview-label">Próxima cita</span>
              {nextCita ? (
                <>
                  <strong>{nextCita.especialidad}</strong>
                  <span className="overview-meta">{formatDateTime(nextCita.fecha)}</span>
                </>
              ) : (
                <>
                  <strong>Sin citas próximas</strong>
                  <span className="overview-meta">Agenda una nueva atención cuando lo necesites.</span>
                </>
              )}
            </div>
            {nextCita && (
              <span className={`status-chip status-chip-${statusTone(nextCita.estado)}`}>
                {capitalize(nextCita.estado ?? 'Sin estado')}
              </span>
            )}
          </article>

          <article className="overview-card">
            <span className="overview-icon overview-icon-soft">
              <Icon name="clipboard" size={22} />
            </span>
            <div className="overview-content">
              <span className="overview-label">Citas agendadas</span>
              <strong className="overview-number">{upcoming.length}</strong>
              <span className="overview-meta">En tu agenda actual</span>
            </div>
          </article>

          <article className="overview-card">
            <span className="overview-icon overview-icon-soft">
              <Icon name="flask" size={22} />
            </span>
            <div className="overview-content">
              <span className="overview-label">Resultados disponibles</span>
              <strong className="overview-number">{resultados.length}</strong>
              <span className="overview-meta">Informes procesados</span>
            </div>
          </article>
        </section>

        <div className="patient-columns">
          <section className="section-card" aria-labelledby="citas-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  <Icon name="calendar" size={16} />
                  Agenda
                </p>
                <h2 id="citas-title">Mis citas</h2>
              </div>
              <div className="view-switcher" role="group" aria-label="Vista de citas">
                <button
                  aria-pressed={citasView === 'proximas'}
                  className={citasView === 'proximas' ? 'view-tab is-active' : 'view-tab'}
                  onClick={() => setCitasView('proximas')}
                  type="button"
                >
                  Próximas
                  <span>{upcoming.length}</span>
                </button>
                <button
                  aria-pressed={citasView === 'historial'}
                  className={citasView === 'historial' ? 'view-tab is-active' : 'view-tab'}
                  onClick={() => setCitasView('historial')}
                  type="button"
                >
                  Historial
                  <span>{history.length}</span>
                </button>
              </div>
            </div>

            {actionSuccess && (
              <p className="form-message form-message-success appointment-feedback" role="status">
                <Icon name="check" size={18} />
                {actionSuccess}
              </p>
            )}

            {citasLoading ? (
              <div className="skeleton-list" aria-label="Cargando citas">
                <span className="skeleton-row" />
                <span className="skeleton-row" />
                <span className="skeleton-row" />
              </div>
            ) : citasError ? (
              <div className="inline-state inline-state-error">
                <span className="state-icon">
                  <Icon name="alert" size={22} />
                </span>
                <p>{citasError}</p>
                <button className="button button-secondary button-small" onClick={() => void loadCitas()} type="button">
                  <Icon name="refresh" size={16} />
                  Reintentar
                </button>
              </div>
            ) : displayedCitas.length === 0 ? (
              <div className="inline-state">
                <span className="state-icon">
                  <Icon name="calendar" size={22} />
                </span>
                <h3>{citasView === 'proximas' ? 'No tienes citas próximas' : 'Aún no hay historial'}</h3>
                <p>
                  {citasView === 'proximas'
                    ? 'Usa “Agendar cita” para reservar una nueva atención.'
                    : 'Las citas atendidas o canceladas aparecerán aquí.'}
                </p>
              </div>
            ) : (
              <div className="appointment-list">
                {displayedCitas.map((cita) => {
                  const parts = dateParts(cita.fecha)
                  return (
                    <article className="appointment-row" key={cita.id}>
                      <div className="date-tile" aria-hidden="true">
                        <span>{parts.month}</span>
                        <strong>{parts.day}</strong>
                      </div>
                      <div className="appointment-main">
                        <div className="appointment-title">
                          <h3>{cita.especialidad}</h3>
                          <span className={`status-chip status-chip-${statusTone(cita.estado)}`}>
                            {capitalize(cita.estado ?? 'Sin estado')}
                          </span>
                        </div>
                        <p>
                          <Icon name="clock" size={15} />
                          {formatDateTime(cita.fecha)}
                        </p>
                        {isUpcoming(cita) && (
                          <div className="appointment-actions">
                            <button
                              className="button button-secondary button-small"
                              onClick={() => openReschedule(cita)}
                              type="button"
                            >
                              <Icon name="calendar" size={15} />
                              Posponer
                            </button>
                            <button
                              className="button button-quiet button-small appointment-cancel"
                              onClick={() => openCancel(cita)}
                              type="button"
                            >
                              Cancelar cita
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="appointment-ref">Cita #{cita.id}</span>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="section-card results-section" aria-labelledby="resultados-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  <Icon name="flask" size={16} />
                  Laboratorio
                </p>
                <h2 id="resultados-title">Resultados</h2>
              </div>
              <span className="count-badge">{resultados.length}</span>
            </div>

            {resultadosLoading ? (
              <div className="skeleton-list" aria-label="Cargando resultados">
                <span className="skeleton-row skeleton-row-tall" />
                <span className="skeleton-row skeleton-row-tall" />
              </div>
            ) : resultadosError ? (
              <div className="inline-state inline-state-error">
                <span className="state-icon">
                  <Icon name="alert" size={22} />
                </span>
                <p>{resultadosError}</p>
                <button className="button button-secondary button-small" onClick={() => void loadResultados()} type="button">
                  <Icon name="refresh" size={16} />
                  Reintentar
                </button>
              </div>
            ) : resultados.length === 0 ? (
              <div className="inline-state">
                <span className="state-icon">
                  <Icon name="flask" size={22} />
                </span>
                <h3>Sin resultados por ahora</h3>
                <p>Cuando un examen sea procesado, estará disponible aquí.</p>
              </div>
            ) : (
              <div className="result-list">
                {resultados.map((resultado) => {
                  const entries = Object.entries(resultado.detalle_resultado ?? {}).filter(
                    ([key]) => key !== 'pdf_url',
                  )
                  return (
                    <article className="result-card" key={resultado.id}>
                      <div className="result-head">
                        <span className="result-icon">
                          <Icon name="file" size={19} />
                        </span>
                        <div>
                          <h3>{resultado.tipo_examen}</h3>
                          <p>
                            Orden #{resultado.orden_id}
                            {resultado.fecha_resultado && ` · ${formatDateTime(resultado.fecha_resultado)}`}
                          </p>
                        </div>
                        <span className="status-chip status-chip-green">Listo</span>
                      </div>

                      {entries.length > 0 && (
                        <dl className="result-detail">
                          {entries.map(([key, value]) => (
                            <div key={key}>
                              <dt>{humanizeKey(key)}</dt>
                              <dd>{formatDetailValue(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      <div className="result-actions">
                        {resultado.pdf_url && (
                          <a
                            className="button button-secondary button-small"
                            href={resolveFileUrl(resultado.pdf_url)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <Icon name="file" size={16} />
                            Ver PDF
                          </a>
                        )}
                        <button
                          className="button button-quiet button-small"
                          onClick={() => downloadLabSummary(resultado)}
                          type="button"
                        >
                          <Icon name="download" size={16} />
                          Descargar resumen
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <p className="portal-foot">
          <Icon name="shield" size={15} />
          Sesión protegida para {session?.username}. No compartas tus credenciales.
        </p>
      </main>

      {cancelTarget && (
        <ModalShell
          description={`${cancelTarget.especialidad} · ${formatDateTime(cancelTarget.fecha)}`}
          onClose={closeDialogs}
          title="Cancelar cita"
        >
          <p className="modal-copy">
            La cita quedará cancelada y pasará a tu historial. Esta acción no se puede deshacer.
          </p>
          {actionError && (
            <p className="form-message form-message-error" role="alert">
              <Icon name="alert" size={18} />
              {actionError}
            </p>
          )}
          <div className="modal-actions">
            <button className="button button-secondary" onClick={closeDialogs} type="button">
              Volver
            </button>
            <button
              className="button button-danger"
              disabled={actionPending === 'cancel'}
              onClick={() => void handleCancel()}
              type="button"
            >
              {actionPending === 'cancel' ? 'Cancelando…' : 'Sí, cancelar cita'}
            </button>
          </div>
        </ModalShell>
      )}

      {rescheduleTarget && (
        <ModalShell
          description={`${rescheduleTarget.especialidad} · ${formatDateTime(rescheduleTarget.fecha)}`}
          onClose={closeDialogs}
          title="Posponer cita"
        >
          <form className="modal-form" onSubmit={handleReschedule}>
            <div className="field">
              <label htmlFor="reschedule-date">Nueva fecha y hora</label>
              <div className="input-shell">
                <Icon name="clock" size={19} />
                <input
                  autoComplete="off"
                  id="reschedule-date"
                  min={localDateTimeMin()}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  required
                  type="datetime-local"
                  value={rescheduleDate}
                />
              </div>
            </div>
            {actionError && (
              <p className="form-message form-message-error" role="alert">
                <Icon name="alert" size={18} />
                {actionError}
              </p>
            )}
            <div className="modal-actions">
              <button className="button button-secondary" onClick={closeDialogs} type="button">
                Volver
              </button>
              <button className="button button-primary" disabled={actionPending === 'reschedule'} type="submit">
                {actionPending === 'reschedule' ? 'Guardando…' : 'Guardar nuevo horario'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  )
}
