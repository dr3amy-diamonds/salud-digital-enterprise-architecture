import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { Feedback } from '../../components/staff/Feedback'
import { ModulePage } from '../../components/staff/ModulePage'
import { PatientSelect } from '../../components/staff/PatientSelect'
import { StatusChip } from '../../components/staff/StatusChip'
import { useAuth } from '../../context/auth'
import type { Paciente, Receta } from '../../lib/apiTypes'
import { getApiError } from '../../lib/format'
import { useApiList } from '../../lib/useApiList'
import './FarmaciaView.css'

const EMPTY_FORM = { paciente_id: '', medicamento: '', dosis: '' }

type Message = { tone: 'success' | 'error'; text: string } | null

export function FarmaciaView() {
  const { session } = useAuth()
  const patients = useApiList<Paciente>('/admision/pacientes')
  const recetas = useApiList<Receta>('/farmacia/recetas')
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState(false)

  const canWrite =
    session?.role === 'medico' || session?.role === 'farmaceutico' || session?.role === 'admin'

  const patientName = (id: number) =>
    patients.data.find((patient) => patient.id === id)?.nombre ?? `Paciente #${id}`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setPending(true)
    try {
      await api.post('/farmacia/recetas', {
        paciente_id: Number(form.paciente_id),
        medicamento: form.medicamento.trim(),
        dosis: form.dosis.trim(),
      })
      setForm({ ...EMPTY_FORM, paciente_id: form.paciente_id })
      setMessage({ tone: 'success', text: 'Receta registrada para dispensación.' })
      await recetas.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <ModulePage
      description="Registra fórmulas médicas y consulta las recetas pendientes de dispensación. Gerencia consulta sin modificar."
      icon="pill"
      kicker="Módulo 04 · Farmacia"
      readOnly={!canWrite}
      title="Recetas y dispensación"
    >
      <div className={canWrite ? 'pharmacy-layout' : 'pharmacy-layout pharmacy-layout-wide'}>
        {canWrite && (
          <section aria-labelledby="recipe-form-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Prescripción</p>
                <h2 className="panel-title" id="recipe-form-title">
                  Nueva receta
                </h2>
                <p className="panel-subtitle">Medicamento y dosis quedan en la trazabilidad.</p>
              </div>
            </div>
            <form className="form-stack" onSubmit={handleSubmit}>
              <PatientSelect
                id="recipe-patient"
                onChange={(value) => setForm({ ...form, paciente_id: value })}
                patients={patients.data}
                value={form.paciente_id}
              />
              <div className="field">
                <label htmlFor="recipe-medication">Medicamento</label>
                <input
                  id="recipe-medication"
                  minLength={2}
                  onChange={(event) => setForm({ ...form, medicamento: event.target.value })}
                  placeholder="Ej. Acetaminofén 500 mg"
                  required
                  type="text"
                  value={form.medicamento}
                />
              </div>
              <div className="field">
                <label htmlFor="recipe-dose">Dosis e indicaciones</label>
                <textarea
                  id="recipe-dose"
                  maxLength={300}
                  onChange={(event) => setForm({ ...form, dosis: event.target.value })}
                  placeholder="Ej. Una tableta cada 8 horas por 3 días."
                  required
                  rows={3}
                  value={form.dosis}
                />
              </div>
              {message && <Feedback tone={message.tone}>{message.text}</Feedback>}
              <div className="form-actions">
                <button
                  className="button button-primary"
                  disabled={pending || patients.data.length === 0}
                  type="submit"
                >
                  {pending ? 'Registrando…' : 'Registrar receta'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section aria-labelledby="recipes-list-title" className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Trazabilidad</p>
              <h2 className="panel-title" id="recipes-list-title">
                Recetas registradas
              </h2>
            </div>
            <span className="count-badge">{recetas.data.length}</span>
          </div>
          {recetas.loading ? (
            <LoadingRows rows={4} />
          ) : recetas.error ? (
            <ErrorState message={recetas.error} onRetry={() => void recetas.reload()} />
          ) : recetas.data.length === 0 ? (
            <EmptyState icon="pill" title="Sin recetas">
              Las fórmulas médicas registradas aparecerán aquí.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Paciente</th>
                    <th scope="col">Medicamento</th>
                    <th scope="col">Dosis</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recetas.data.map((receta) => (
                    <tr key={receta.id}>
                      <td className="cell-strong" data-label="Paciente">
                        {patientName(receta.paciente_id)}
                      </td>
                      <td data-label="Medicamento">{receta.medicamento}</td>
                      <td className="cell-wrap" data-label="Dosis">
                        {receta.dosis}
                      </td>
                      <td data-label="Estado">
                        <StatusChip estado={receta.estado} />
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
