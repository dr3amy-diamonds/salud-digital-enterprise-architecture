import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/client'
import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { Feedback } from '../../components/staff/Feedback'
import { ModulePage } from '../../components/staff/ModulePage'
import { PatientSelect } from '../../components/staff/PatientSelect'
import { StatusChip } from '../../components/staff/StatusChip'
import { useAuth } from '../../context/auth'
import type { OrdenLab, Paciente, ResultadoLab } from '../../lib/apiTypes'
import { getApiError } from '../../lib/format'
import { useApiList } from '../../lib/useApiList'
import './LabView.css'

interface ResultRow {
  key: number
  field: string
  value: string
}

type Message = { tone: 'success' | 'error'; text: string } | null

const EMPTY_ORDER = { paciente_id: '', tipo_examen: '' }

export function LabView() {
  const { session } = useAuth()
  const patients = useApiList<Paciente>('/admision/pacientes')
  const orders = useApiList<OrdenLab>('/lab/ordenes')
  const results = useApiList<ResultadoLab>('/lab/resultados')
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER)
  const [orderMessage, setOrderMessage] = useState<Message>(null)
  const [resultOrder, setResultOrder] = useState('')
  const [resultRows, setResultRows] = useState<ResultRow[]>([{ key: 1, field: '', value: '' }])
  const [resultMessage, setResultMessage] = useState<Message>(null)
  const [pending, setPending] = useState<'order' | 'result' | null>(null)
  const nextRowKey = useRef(2)

  const canOrder =
    session?.role === 'medico' || session?.role === 'bacteriologo' || session?.role === 'admin'
  const canResult = session?.role === 'bacteriologo' || session?.role === 'admin'
  const hasForms = canOrder || canResult

  const patientName = (id: number) =>
    patients.data.find((patient) => patient.id === id)?.nombre ?? `Paciente #${id}`
  const pendingOrders = orders.data.filter((order) => order.estado !== 'Procesada')
  const orderPatient = (orderId: number) => {
    const order = orders.data.find((item) => item.id === orderId)
    return order ? patientName(order.paciente_id) : `Orden #${orderId}`
  }

  const addRow = () => {
    const key = nextRowKey.current++
    setResultRows((rows) => [...rows, { key, field: '', value: '' }])
  }

  const updateRow = (key: number, part: 'field' | 'value', value: string) => {
    setResultRows((rows) => rows.map((row) => (row.key === key ? { ...row, [part]: value } : row)))
  }

  const removeRow = (key: number) => {
    setResultRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.key !== key)))
  }

  const handleOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOrderMessage(null)
    setPending('order')
    try {
      await api.post('/lab/ordenes', {
        paciente_id: Number(orderForm.paciente_id),
        tipo_examen: orderForm.tipo_examen.trim(),
      })
      setOrderForm({ ...EMPTY_ORDER, paciente_id: orderForm.paciente_id })
      setOrderMessage({ tone: 'success', text: 'Orden de laboratorio creada.' })
      await orders.reload()
    } catch (error) {
      setOrderMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  const handleResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResultMessage(null)
    const detail = Object.fromEntries(
      resultRows
        .filter((row) => row.field.trim() !== '')
        .map((row) => [row.field.trim(), row.value.trim()]),
    )
    if (Object.keys(detail).length === 0) {
      setResultMessage({ tone: 'error', text: 'Agrega al menos un resultado con nombre y valor.' })
      return
    }
    setPending('result')
    try {
      await api.post('/lab/resultados', {
        orden_id: Number(resultOrder),
        detalle_resultado: detail,
      })
      setResultOrder('')
      setResultRows([{ key: nextRowKey.current++, field: '', value: '' }])
      setResultMessage({ tone: 'success', text: 'Resultado registrado. La orden quedó procesada.' })
      await Promise.all([orders.reload(), results.reload()])
    } catch (error) {
      setResultMessage({ tone: 'error', text: getApiError(error) })
    } finally {
      setPending(null)
    }
  }

  return (
    <ModulePage
      description="Crea órdenes de examen y registra los resultados del procesamiento. El médico ordena; bacteriología y administración procesan."
      icon="flask"
      kicker="Módulo 03 · Laboratorio"
      readOnly={!hasForms}
      title="Órdenes y resultados"
    >
      <div className={hasForms ? 'lab-layout' : 'lab-layout lab-layout-wide'}>
        {hasForms && (
          <div className="lab-forms">
            {canOrder && (
              <section aria-labelledby="order-form-title" className="panel">
                <div className="panel-head">
                  <div>
                    <p className="section-kicker">Solicitud</p>
                    <h2 className="panel-title" id="order-form-title">
                      Nueva orden
                    </h2>
                    <p className="panel-subtitle">La orden queda pendiente hasta registrar el resultado.</p>
                  </div>
                </div>
                <form className="form-stack" onSubmit={handleOrder}>
                  <PatientSelect
                    id="order-patient"
                    onChange={(value) => setOrderForm({ ...orderForm, paciente_id: value })}
                    patients={patients.data}
                    value={orderForm.paciente_id}
                  />
                  <div className="field">
                    <label htmlFor="order-exam">Tipo de examen</label>
                    <input
                      id="order-exam"
                      minLength={2}
                      onChange={(event) =>
                        setOrderForm({ ...orderForm, tipo_examen: event.target.value })
                      }
                      placeholder="Ej. Hemograma completo"
                      required
                      type="text"
                      value={orderForm.tipo_examen}
                    />
                  </div>
                  {orderMessage && <Feedback tone={orderMessage.tone}>{orderMessage.text}</Feedback>}
                  <div className="form-actions">
                    <button
                      className="button button-primary"
                      disabled={pending === 'order' || patients.data.length === 0}
                      type="submit"
                    >
                      {pending === 'order' ? 'Creando…' : 'Crear orden'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {canResult && (
              <section aria-labelledby="result-form-title" className="panel">
                <div className="panel-head">
                  <div>
                    <p className="section-kicker">Procesamiento</p>
                    <h2 className="panel-title" id="result-form-title">
                      Registrar resultado
                    </h2>
                    <p className="panel-subtitle">Solo aparecen órdenes sin resultado previo.</p>
                  </div>
                </div>
                <form className="form-stack" onSubmit={handleResult}>
                  <div className="field">
                    <label htmlFor="result-order">Orden pendiente</label>
                    <select
                      id="result-order"
                      onChange={(event) => setResultOrder(event.target.value)}
                      required
                      value={resultOrder}
                    >
                      <option value="">Selecciona una orden</option>
                      {pendingOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          Orden #{order.id} · {order.tipo_examen} · {patientName(order.paciente_id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <fieldset className="result-fields">
                    <legend>Detalle del resultado</legend>
                    {resultRows.map((row, index) => (
                      <div className="result-row" key={row.key}>
                        <div className="field">
                          <label className="sr-only" htmlFor={`result-field-${row.key}`}>
                            Nombre del resultado {index + 1}
                          </label>
                          <input
                            autoComplete="off"
                            id={`result-field-${row.key}`}
                            onChange={(event) => updateRow(row.key, 'field', event.target.value)}
                            placeholder="Ej. Hemoglobina"
                            spellCheck={false}
                            type="text"
                            value={row.field}
                          />
                        </div>
                        <div className="field">
                          <label className="sr-only" htmlFor={`result-value-${row.key}`}>
                            Valor del resultado {index + 1}
                          </label>
                          <input
                            autoComplete="off"
                            id={`result-value-${row.key}`}
                            onChange={(event) => updateRow(row.key, 'value', event.target.value)}
                            placeholder="Ej. 14.2 g/dL"
                            type="text"
                            value={row.value}
                          />
                        </div>
                        <button
                          aria-label={`Quitar resultado ${index + 1}`}
                          className="button button-quiet button-small result-remove"
                          disabled={resultRows.length === 1}
                          onClick={() => removeRow(row.key)}
                          type="button"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button className="button button-secondary button-small" onClick={addRow} type="button">
                      Agregar fila
                    </button>
                  </fieldset>

                  {resultMessage && <Feedback tone={resultMessage.tone}>{resultMessage.text}</Feedback>}
                  <div className="form-actions">
                    <button
                      className="button button-primary"
                      disabled={pending === 'result' || pendingOrders.length === 0}
                      type="submit"
                    >
                      {pending === 'result' ? 'Registrando…' : 'Registrar resultado'}
                    </button>
                    {pendingOrders.length === 0 && (
                      <span className="form-hint">No hay órdenes pendientes de procesar.</span>
                    )}
                  </div>
                </form>
              </section>
            )}
          </div>
        )}

        <div className="lab-lists">
          <section aria-labelledby="orders-list-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Seguimiento</p>
                <h2 className="panel-title" id="orders-list-title">
                  Órdenes
                </h2>
              </div>
              <span className="count-badge">{orders.data.length}</span>
            </div>
            {orders.loading ? (
              <LoadingRows />
            ) : orders.error ? (
              <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
            ) : orders.data.length === 0 ? (
              <EmptyState icon="flask" title="Sin órdenes">
                Las órdenes creadas aparecerán aquí.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Orden</th>
                      <th scope="col">Paciente</th>
                      <th scope="col">Examen</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.data.map((order) => (
                      <tr key={order.id}>
                        <td className="cell-muted" data-label="Orden">
                          #{order.id}
                        </td>
                        <td className="cell-strong" data-label="Paciente">
                          {patientName(order.paciente_id)}
                        </td>
                        <td data-label="Examen">{order.tipo_examen}</td>
                        <td data-label="Estado">
                          <StatusChip estado={order.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="results-list-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Entregables</p>
                <h2 className="panel-title" id="results-list-title">
                  Resultados
                </h2>
              </div>
              <span className="count-badge">{results.data.length}</span>
            </div>
            {results.loading ? (
              <LoadingRows />
            ) : results.error ? (
              <ErrorState message={results.error} onRetry={() => void results.reload()} />
            ) : results.data.length === 0 ? (
              <EmptyState icon="file" title="Sin resultados procesados">
                El portal del paciente mostrará los resultados cuando estén listos.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Orden</th>
                      <th scope="col">Paciente</th>
                      <th scope="col">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.data.map((result) => (
                      <tr key={result.id}>
                        <td className="cell-muted" data-label="Orden">
                          #{result.orden_id}
                        </td>
                        <td className="cell-strong" data-label="Paciente">
                          {orderPatient(result.orden_id)}
                        </td>
                        <td className="cell-wrap" data-label="Detalle">
                          <code className="detail-code">{JSON.stringify(result.detalle)}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </ModulePage>
  )
}
