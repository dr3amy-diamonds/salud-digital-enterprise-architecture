import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { Feedback } from '../../components/staff/Feedback'
import { ModulePage } from '../../components/staff/ModulePage'
import { PatientSelect } from '../../components/staff/PatientSelect'
import type { Cita, HistoriaClinica, Paciente } from '../../lib/apiTypes'
import { formatDate, getApiError } from '../../lib/format'
import { useApiList } from '../../lib/useApiList'
import './ClinicoView.css'

const EMPTY_FORM = { paciente_id: '', cita_id: '', motivo_consulta: '', diagnostico: '' }

type Message = { tone: 'success' | 'error'; text: string } | null

export function ClinicoView() {
  const patients = useApiList<Paciente>('/admision/pacientes')
  const citas = useApiList<Cita>('/admision/citas')
  const [filter, setFilter] = useState('')
  const historias = useApiList<HistoriaClinica>(
    filter ? `/clinico/historias?paciente_id=${filter}` : '/clinico/historias',
  )
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState(false)

  const patientName = (id: number) =>
    patients.data.find((patient) => patient.id === id)?.nombre ?? `Paciente #${id}`
  const citaLabel = (id: number | null) => {
    if (!id) {
      return 'Sin cita asociada'
    }
    const cita = citas.data.find((item) => item.id === id)
    return cita ? `Cita #${cita.id} · ${formatDate(cita.fecha)}` : `Cita #${id}`
  }
  const selectedCitas = form.paciente_id
    ? citas.data.filter((cita) => cita.paciente_id === Number(form.paciente_id))
    : []

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setPending(true)
    try {
      await api.post('/clinico/historias', {
        paciente_id: Number(form.paciente_id),
        cita_id: form.cita_id ? Number(form.cita_id) : null,
        motivo_consulta: form.motivo_consulta.trim(),
        diagnostico: form.diagnostico.trim(),
      })
      setForm({ ...EMPTY_FORM, paciente_id: form.paciente_id })
      setMessage({ tone: 'success', text: 'Atención registrada en la historia clínica.' })
      await historias.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <ModulePage
      description="Registra la atención del paciente y consulta su historia. Este módulo solo está disponible para el rol médico."
      icon="user"
      kicker="Módulo 02 · Historia clínica"
      title="Atención y antecedentes"
    >
      <div className="clinical-layout">
        <section aria-labelledby="history-form-title" className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Nueva atención</p>
              <h2 className="panel-title" id="history-form-title">
                Registrar historia
              </h2>
              <p className="panel-subtitle">La cita asociada es opcional y no puede repetirse.</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={handleSubmit}>
            <PatientSelect
              id="history-patient"
              onChange={(value) => setForm({ ...form, paciente_id: value, cita_id: '' })}
              patients={patients.data}
              value={form.paciente_id}
            />
            <div className="field">
              <label htmlFor="history-cita">Cita asociada</label>
              <select
                disabled={!form.paciente_id}
                id="history-cita"
                onChange={(event) => setForm({ ...form, cita_id: event.target.value })}
                value={form.cita_id}
              >
                <option value="">Sin cita asociada</option>
                {selectedCitas.map((cita) => (
                  <option key={cita.id} value={cita.id}>
                    {citaLabel(cita.id)} · {cita.especialidad}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="history-reason">Motivo de consulta</label>
              <textarea
                id="history-reason"
                maxLength={500}
                onChange={(event) => setForm({ ...form, motivo_consulta: event.target.value })}
                placeholder="Describe el motivo de la atención."
                required
                rows={3}
                value={form.motivo_consulta}
              />
            </div>
            <div className="field">
              <label htmlFor="history-diagnosis">Diagnóstico</label>
              <textarea
                id="history-diagnosis"
                maxLength={800}
                onChange={(event) => setForm({ ...form, diagnostico: event.target.value })}
                placeholder="Registra el diagnóstico y las indicaciones."
                required
                rows={4}
                value={form.diagnostico}
              />
            </div>
            {message && <Feedback tone={message.tone}>{message.text}</Feedback>}
            <div className="form-actions">
              <button
                className="button button-primary"
                disabled={pending || patients.data.length === 0}
                type="submit"
              >
                {pending ? 'Registrando…' : 'Guardar atención'}
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="history-list-title" className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Consulta</p>
              <h2 className="panel-title" id="history-list-title">
                Historias registradas
              </h2>
            </div>
            <div className="field filter-field">
              <label htmlFor="history-filter">Filtrar por paciente</label>
              <select
                id="history-filter"
                onChange={(event) => setFilter(event.target.value)}
                value={filter}
              >
                <option value="">Todos los pacientes</option>
                {patients.data.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {historias.loading ? (
            <LoadingRows rows={4} tall />
          ) : historias.error ? (
            <ErrorState message={historias.error} onRetry={() => void historias.reload()} />
          ) : historias.data.length === 0 ? (
            <EmptyState icon="user" title="Sin historias registradas">
              La primera atención médica aparecerá en esta lista.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Paciente</th>
                    <th scope="col">Cita</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {historias.data.map((historia) => (
                    <tr key={historia.id}>
                      <td className="cell-strong" data-label="Paciente">
                        {patientName(historia.paciente_id)}
                      </td>
                      <td className="cell-muted" data-label="Cita">
                        {citaLabel(historia.cita_id)}
                      </td>
                      <td className="cell-wrap" data-label="Motivo">
                        {historia.motivo}
                      </td>
                      <td className="cell-wrap" data-label="Diagnóstico">
                        {historia.diagnostico}
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
