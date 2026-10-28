import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { Feedback } from '../../components/staff/Feedback'
import { ModulePage } from '../../components/staff/ModulePage'
import { PatientSelect } from '../../components/staff/PatientSelect'
import { StatusChip } from '../../components/staff/StatusChip'
import { useAuth } from '../../context/auth'
import type { Factura, Paciente, ResumenDia } from '../../lib/apiTypes'
import { formatCurrency, formatDate, getApiError } from '../../lib/format'
import { useApiList } from '../../lib/useApiList'
import './FacturacionView.css'

const EMPTY_FORM = { paciente_id: '', total: '' }

type Message = { tone: 'success' | 'error'; text: string } | null
type Concepto = 'Atención médica' | 'Examen de laboratorio' | 'Medicamentos'

export function FacturacionView() {
  const { session } = useAuth()
  const patients = useApiList<Paciente>('/admision/pacientes')
  const facturas = useApiList<Factura>('/facturacion/facturas')
  const resumen = useApiList<ResumenDia>('/facturacion/resumen')
  const [form, setForm] = useState<{ paciente_id: string; total: string }>({ paciente_id: '', total: '' })
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState(false)
  const [concepto, setConcepto] = useState<Concepto>('Atención médica')

  const canWrite = session?.role === 'cajero' || session?.role === 'admin'
  const patientName = (id: number) =>
    patients.data.find((patient) => patient.id === id)?.nombre ?? `Paciente #${id}`

  const totalRecaudado = resumen.data.reduce((total, day) => total + day.total_recaudado, 0)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setPending(true)
    try {
      await api.post('/facturacion/facturas', {
        paciente_id: Number(form.paciente_id),
        total: Number(form.total),
        concepto,
      })
      setForm({ ...EMPTY_FORM, paciente_id: form.paciente_id })
      setConcepto('Atención médica')
      setMessage({ tone: 'success', text: 'Factura emitida. El resumen diario se actualizó.' })
      await Promise.all([facturas.reload(), resumen.reload()])
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(false)
    }
  }

  const handlePagar = async (facturaId: number) => {
    setPending(true)
    try {
      await api.patch(`/facturacion/facturas/${facturaId}/pagar`)
      setMessage({ tone: 'success', text: 'Factura marcada como pagada.' })
      await facturas.reload()
    } catch (error) {
      setMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <ModulePage
      description="Emite facturas de atención y revisa el recaudo diario. Gerencia consulta la operación sin modificarla."
      icon="receipt"
      kicker="Módulo 05 · Facturación"
      readOnly={!canWrite}
      title="Facturas y recaudo"
    >
      <section aria-label="Resumen de facturación" className="billing-stats">
        <article className="panel billing-stat">
          <span className="billing-stat-label">Facturas registradas</span>
          <strong>{facturas.data.length}</strong>
          <span className="billing-stat-meta">En el historial disponible</span>
        </article>
        <article className="panel billing-stat">
          <span className="billing-stat-label">Total recaudado</span>
          <strong>{formatCurrency(totalRecaudado)}</strong>
          <span className="billing-stat-meta">Según la vista diaria</span>
        </article>
        <article className="panel billing-stat">
          <span className="billing-stat-label">Días con movimiento</span>
          <strong>{resumen.data.length}</strong>
          <span className="billing-stat-meta">Fechas en el resumen</span>
        </article>
      </section>

      <div className={canWrite ? 'billing-layout' : 'billing-layout billing-layout-wide'}>
        {canWrite && (
          <section aria-labelledby="invoice-form-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Emisión</p>
                <h2 className="panel-title" id="invoice-form-title">
                  Nueva factura
                </h2>
                <p className="panel-subtitle">El valor debe ser mayor que cero.</p>
              </div>
            </div>
            <form className="form-stack" onSubmit={handleSubmit}>
              <PatientSelect
                id="invoice-patient"
                onChange={(value) => setForm({ ...form, paciente_id: value })}
                patients={patients.data}
                value={form.paciente_id}
              />
              <div className="field">
                <label htmlFor="invoice-total">Total a cobrar</label>
                <input
                  id="invoice-total"
                  inputMode="decimal"
                  min="1"
                  onChange={(event) => setForm({ ...form, total: event.target.value })}
                  placeholder="Ej. 85000"
                  required
                  step="1"
                  type="number"
                  value={form.total}
                />
              </div>
              <div className="field">
                <label htmlFor="invoice-concepto">Concepto del cobro</label>
                <select
                  id="invoice-concepto"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value as Concepto)}
                >
                  <option value="Atención médica">Atención médica</option>
                  <option value="Examen de laboratorio">Examen de laboratorio</option>
                  <option value="Medicamentos">Medicamentos</option>
                </select>
              </div>
              {message && <Feedback tone={message.tone}>{message.text}</Feedback>}
              <div className="form-actions">
                <button
                  className="button button-primary"
                  disabled={pending || patients.data.length === 0}
                  type="submit"
                >
                  {pending ? 'Emitiendo…' : 'Emitir factura'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section aria-labelledby="invoices-list-title" className="panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Historial</p>
              <h2 className="panel-title" id="invoices-list-title">
                Facturas
              </h2>
            </div>
          </div>
          {facturas.loading ? (
            <LoadingRows rows={4} />
          ) : facturas.error ? (
            <ErrorState message={facturas.error} onRetry={() => void facturas.reload()} />
          ) : facturas.data.length === 0 ? (
            <EmptyState icon="receipt" title="Sin facturas">
              Las facturas emitidas aparecerán en esta lista.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Factura</th>
                    <th scope="col">Paciente</th>
                    <th scope="col">Total</th>
                    <th scope="col">Concepto</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.data.map((factura) => (
                    <tr key={factura.id}>
                      <td className="cell-muted" data-label="Factura">
                        #{factura.id}
                      </td>
                      <td className="cell-strong" data-label="Paciente">
                        {patientName(factura.paciente_id)}
                      </td>
                      <td className="cell-number" data-label="Total">
                        {formatCurrency(factura.total)}
                      </td>
                      <td data-label="Concepto">
                        {factura.concepto || '—'}
                      </td>
                      <td data-label="Estado">
                        <StatusChip estado={factura.estado_pago} />
                      </td>
                      <td data-label="Acción">
                        {factura.estado_pago !== 'Pagada' && (
                          <button
                            className="button button-secondary"
                            onClick={() => handlePagar(factura.id)}
                            disabled={pending}
                          >
                            {pending ? 'Procesando…' : 'Pagar'}
                          </button>
                        )}
                        {factura.estado_pago === 'Pagada' && (
                          <span className="chip chip-small">Pagada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="daily-summary-title" className="panel">
        <div className="panel-head">
          <div>
            <p className="section-kicker">Gerencia</p>
            <h2 className="panel-title" id="daily-summary-title">
              Resumen diario
            </h2>
          </div>
          <span className="count-badge">{resumen.data.length}</span>
        </div>
        {resumen.loading ? (
          <LoadingRows />
        ) : resumen.error ? (
          <ErrorState message={resumen.error} onRetry={() => void resumen.reload()} />
        ) : resumen.data.length === 0 ? (
          <EmptyState icon="receipt" title="Sin movimiento diario">
            Emite una factura para alimentar la vista gerencial.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Día</th>
                  <th scope="col">Facturas</th>
                  <th scope="col">Recaudado</th>
                </tr>
              </thead>
              <tbody>
                {resumen.data.map((day) => (
                  <tr key={day.dia}>
                    <td className="cell-strong" data-label="Día">
                      {formatDate(day.dia)}
                    </td>
                    <td className="cell-number" data-label="Facturas">
                      {day.cantidad_facturas}
                    </td>
                    <td className="cell-number" data-label="Recaudado">
                      {formatCurrency(day.total_recaudado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ModulePage>
  )
}