import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { Feedback } from '../../components/staff/Feedback'
import { ModulePage } from '../../components/staff/ModulePage'
import { PatientSelect } from '../../components/staff/PatientSelect'
import { StatusChip } from '../../components/staff/StatusChip'
import { useAuth } from '../../context/auth'
import type { Cita, Paciente } from '../../lib/apiTypes'
import { formatDateTime, getApiError, localDateTimeMin } from '../../lib/format'
import { ESPECIALIDADES, ESPECIALIDAD_PLACEHOLDER } from '../../lib/specialties'
import { useApiList } from '../../lib/useApiList'
import './AdmisionView.css'

const EMPTY_PATIENT = { nombre: '', documento: '', telefono: '', email: '' }
const EMPTY_CITA = { paciente_id: '', fecha: '', especialidad: '', estado: 'Agendada' }

type Message = { tone: 'success' | 'error'; text: string } | null

export function AdmisionView() {
  const { session } = useAuth()
  const patients = useApiList<Paciente>('/admision/pacientes')
  const citas = useApiList<Cita>('/admision/citas')
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT)
  const [citaForm, setCitaForm] = useState(EMPTY_CITA)
  const [patientMessage, setPatientMessage] = useState<Message>(null)
  const [citaMessage, setCitaMessage] = useState<Message>(null)
  const [pending, setPending] = useState<'patient' | 'cita' | null>(null)

  const canWrite = session?.role === 'medico' || session?.role === 'cajero' || session?.role === 'admin'

  const patientName = (id: number) =>
    patients.data.find((patient) => patient.id === id)?.nombre ?? `Paciente #${id}`

  const handlePatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPatientMessage(null)
    setPending('patient')
    try {
      await api.post('/admision/pacientes', {
        nombre: patientForm.nombre.trim(),
        documento: patientForm.documento.trim(),
        telefono: patientForm.telefono.trim() || null,
        email: patientForm.email.trim() || null,
      })
      setPatientForm(EMPTY_PATIENT)
      setPatientMessage({ tone: 'success', text: 'Paciente registrado. Ya puedes agendar una cita.' })
      await patients.reload()
    } catch (error) {
      setPatientMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleCita = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCitaMessage(null)
    setPending('cita')
    try {
      await api.post<Cita>('/admision/citas', {
        paciente_id: Number(citaForm.paciente_id),
        fecha: citaForm.fecha,
        especialidad: citaForm.especialidad.trim(),
        estado: citaForm.estado,
      })
      setCitaForm({ ...EMPTY_CITA, paciente_id: citaForm.paciente_id })
      setCitaMessage({ tone: 'success', text: 'Cita agendada y agregada a la agenda.' })
      await citas.reload()
    } catch (error) {
      setCitaMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  return (
    <ModulePage
      description="Registra pacientes y coordina las citas del día. Las cuentas sin permiso de escritura solo consultan la agenda."
      icon="clipboard"
      kicker="Módulo 01 · Admisión"
      readOnly={!canWrite}
      title="Pacientes y agenda"
    >
      {canWrite && (
        <div className="admission-forms">
          <section aria-labelledby="patient-form-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Registro</p>
                <h2 className="panel-title" id="patient-form-title">
                  Nuevo paciente
                </h2>
                <p className="panel-subtitle">Documento único. El resto de datos es opcional.</p>
              </div>
            </div>
            <form className="form-stack" onSubmit={handlePatient}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="patient-name">Nombre completo</label>
                  <input
                    autoComplete="name"
                    id="patient-name"
                    minLength={2}
                    onChange={(event) => setPatientForm({ ...patientForm, nombre: event.target.value })}
                    placeholder="Nombre y apellidos"
                    required
                    type="text"
                    value={patientForm.nombre}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-document">Documento</label>
                  <input
                    autoComplete="off"
                    id="patient-document"
                    minLength={5}
                    onChange={(event) =>
                      setPatientForm({ ...patientForm, documento: event.target.value })
                    }
                    placeholder="Número de documento"
                    required
                    spellCheck={false}
                    type="text"
                    value={patientForm.documento}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="patient-phone">Teléfono</label>
                  <input
                    autoComplete="tel"
                    id="patient-phone"
                    onChange={(event) => setPatientForm({ ...patientForm, telefono: event.target.value })}
                    placeholder="Número de contacto"
                    type="tel"
                    value={patientForm.telefono}
                  />
                </div>
                <div className="field">
                  <label htmlFor="patient-email">Correo electrónico</label>
                  <input
                    autoComplete="email"
                    id="patient-email"
                    onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })}
                    placeholder="nombre@correo.com"
                    spellCheck={false}
                    type="email"
                    value={patientForm.email}
                  />
                </div>
              </div>
              {patientMessage && <Feedback tone={patientMessage.tone}>{patientMessage.text}</Feedback>}
              <div className="form-actions">
                <button className="button button-primary" disabled={pending === 'patient'} type="submit">
                  {pending === 'patient' ? 'Registrando…' : 'Registrar paciente'}
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="cita-form-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Agenda</p>
                <h2 className="panel-title" id="cita-form-title">
                  Agendar cita
                </h2>
                <p className="panel-subtitle">Selecciona el paciente y la fecha de atención.</p>
              </div>
            </div>
            <form className="form-stack" onSubmit={handleCita}>
              <PatientSelect
                id="cita-patient"
                onChange={(value) => setCitaForm({ ...citaForm, paciente_id: value })}
                patients={patients.data}
                value={citaForm.paciente_id}
              />
              <div className="field-row">
                <div className="field">
                  <label htmlFor="cita-specialty">Especialidad</label>
                  <select
                    id="cita-specialty"
                    name="especialidad"
                    onChange={(event) =>
                      setCitaForm({ ...citaForm, especialidad: event.target.value })
                    }
                    required
                    value={citaForm.especialidad}
                  >
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
                <div className="field">
                  <label htmlFor="cita-state">Estado</label>
                  <select
                    id="cita-state"
                    onChange={(event) => setCitaForm({ ...citaForm, estado: event.target.value })}
                    value={citaForm.estado}
                  >
                    <option value="Agendada">Agendada</option>
                    <option value="Atendida">Atendida</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="cita-date">Fecha y hora</label>
                <input
                  id="cita-date"
                  min={localDateTimeMin()}
                  onChange={(event) => setCitaForm({ ...citaForm, fecha: event.target.value })}
                  required
                  type="datetime-local"
                  value={citaForm.fecha}
                />
              </div>
              {citaMessage && <Feedback tone={citaMessage.tone}>{citaMessage.text}</Feedback>}
              <div className="form-actions">
                <button
                  className="button button-primary"
                  disabled={pending === 'cita' || patients.data.length === 0}
                  type="submit"
                >
                  {pending === 'cita' ? 'Agendando…' : 'Confirmar cita'}
                </button>
                {patients.data.length === 0 && (
                  <span className="form-hint">Registra un paciente para habilitar la agenda.</span>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      <div className="admission-lists">
        <section aria-labelledby="patients-list-title" className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Directorio</p>
              <h2 className="panel-title" id="patients-list-title">
                Pacientes
              </h2>
            </div>
            <span className="count-badge">{patients.data.length}</span>
          </div>
          {patients.loading ? (
            <LoadingRows />
          ) : patients.error ? (
            <ErrorState message={patients.error} onRetry={() => void patients.reload()} />
          ) : patients.data.length === 0 ? (
            <EmptyState icon="users" title="Sin pacientes registrados">
              Registra el primer paciente para comenzar la operación.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Paciente</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.data.map((patient) => (
                    <tr key={patient.id}>
                      <td className="cell-strong" data-label="Paciente">
                        {patient.nombre}
                      </td>
                      <td className="cell-muted" data-label="Documento">
                        {patient.documento}
                      </td>
                      <td className="cell-muted" data-label="Contacto">
                        {patient.telefono || patient.email || 'Sin contacto'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="citas-list-title" className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Agenda general</p>
              <h2 className="panel-title" id="citas-list-title">
                Citas
              </h2>
            </div>
            <span className="count-badge">{citas.data.length}</span>
          </div>
          {citas.loading ? (
            <LoadingRows />
          ) : citas.error ? (
            <ErrorState message={citas.error} onRetry={() => void citas.reload()} />
          ) : citas.data.length === 0 ? (
            <EmptyState icon="calendar" title="Agenda vacía">
              Las citas agendadas aparecerán en esta lista.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Paciente</th>
                    <th scope="col">Especialidad</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {citas.data.map((cita) => (
                    <tr key={cita.id}>
                      <td className="cell-muted" data-label="Fecha">
                        {formatDateTime(cita.fecha)}
                      </td>
                      <td className="cell-strong" data-label="Paciente">
                        {patientName(cita.paciente_id)}
                      </td>
                      <td data-label="Especialidad">{cita.especialidad}</td>
                      <td data-label="Estado">
                        <StatusChip estado={cita.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ModulePage>
  )
}
