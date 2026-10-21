import { EmptyState, ErrorState, LoadingRows } from '../../components/staff/DataState'
import { ModulePage } from '../../components/staff/ModulePage'
import type { Cita, Factura, OrdenLab, Paciente, Receta, ResumenDia } from '../../lib/apiTypes'
import { formatCurrency, formatDate } from '../../lib/format'
import { useApiList } from '../../lib/useApiList'
import './GerenciaView.css'

function matches(estado: string | null, values: string[]): boolean {
  const value = (estado ?? '').toLowerCase()
  return values.includes(value)
}

export function GerenciaView() {
  const resumen = useApiList<ResumenDia>('/facturacion/resumen')
  const facturas = useApiList<Factura>('/facturacion/facturas')
  const citas = useApiList<Cita>('/admision/citas')
  const pacientes = useApiList<Paciente>('/admision/pacientes')
  const ordenes = useApiList<OrdenLab>('/lab/ordenes')
  const recetas = useApiList<Receta>('/farmacia/recetas')

  const loadings = [resumen, facturas, citas, pacientes, ordenes, recetas]
  const someLoading = loadings.some((item) => item.loading)
  const someError = loadings.find((item) => item.error)

  const totalRecaudado = resumen.data.reduce((total, day) => total + day.total_recaudado, 0)
  const diasConMovimiento = resumen.data.length
  const promedioDiario = diasConMovimiento > 0 ? totalRecaudado / diasConMovimiento : 0
  const facturadoPendiente = facturas.data
    .filter((factura) => matches(factura.estado_pago, ['pendiente']))
    .reduce((total, factura) => total + factura.total, 0)

  const citasAgendadas = citas.data.filter((cita) => matches(cita.estado, ['agendada', 'programada'])).length
  const citasAtendidas = citas.data.filter((cita) => matches(cita.estado, ['atendida', 'completada'])).length
  const citasCanceladas = citas.data.filter((cita) => matches(cita.estado, ['cancelada', 'rechazada'])).length

  const ordenesPendientes = ordenes.data.filter((orden) => !matches(orden.estado, ['procesada'])).length
  const ordenesProcesadas = ordenes.data.length - ordenesPendientes
  const recetasPendientes = recetas.data.filter((receta) => !matches(receta.estado, ['dispensada', 'entregada'])).length

  const resumenOrdenado = [...resumen.data].sort((a, b) => (a.dia < b.dia ? 1 : -1))

  const estadoRows = [
    { label: 'Agendadas', value: citasAgendadas, tone: 'blue' as const },
    { label: 'Atendidas', value: citasAtendidas, tone: 'green' as const },
    { label: 'Canceladas', value: citasCanceladas, tone: 'red' as const },
  ]

  const volumenRows = [
    {
      modulo: 'Admisión',
      indicador: 'Pacientes registrados',
      valor: pacientes.data.length,
      detalle: `${citas.data.length} citas en agenda`,
    },
    {
      modulo: 'Laboratorio',
      indicador: 'Órdenes de examen',
      valor: ordenes.data.length,
      detalle: `${ordenesPendientes} pendientes · ${ordenesProcesadas} procesadas`,
    },
    {
      modulo: 'Farmacia',
      indicador: 'Recetas registradas',
      valor: recetas.data.length,
      detalle: `${recetasPendientes} pendientes de dispensación`,
    },
    {
      modulo: 'Facturación',
      indicador: 'Facturas emitidas',
      valor: facturas.data.length,
      detalle: `${formatCurrency(facturadoPendiente)} por recaudar`,
    },
  ]

  return (
    <ModulePage
      description="Panel de lectura para dirección: recaudo, agenda y volumen de servicios. No expone historia clínica ni datos identificables de pacientes."
      icon="chart"
      kicker="Módulo 07 · Gerencia"
      title="Tablero de operación"
    >
      {someLoading ? (
        <LoadingRows rows={3} tall />
      ) : someError ? (
        <ErrorState
          message={someError.error}
          onRetry={() => {
            loadings.forEach((item) => {
              if (item.error) {
                void item.reload()
              }
            })
          }}
        />
      ) : (
        <>
          <section aria-label="Indicadores de recaudo" className="gerencia-kpis">
            <article className="panel gerencia-kpi gerencia-kpi-accent">
              <span className="gerencia-kpi-label">Recaudo total</span>
              <strong>{formatCurrency(totalRecaudado)}</strong>
              <span className="gerencia-kpi-meta">
                {diasConMovimiento} {diasConMovimiento === 1 ? 'día' : 'días'} con movimiento
              </span>
            </article>
            <article className="panel gerencia-kpi">
              <span className="gerencia-kpi-label">Recaudo promedio por día</span>
              <strong>{formatCurrency(promedioDiario)}</strong>
              <span className="gerencia-kpi-meta">Sobre el historial disponible</span>
            </article>
            <article className="panel gerencia-kpi">
              <span className="gerencia-kpi-label">Facturas emitidas</span>
              <strong>{facturas.data.length}</strong>
              <span className="gerencia-kpi-meta">{formatCurrency(facturadoPendiente)} pendientes de pago</span>
            </article>
            <article className="panel gerencia-kpi">
              <span className="gerencia-kpi-label">Citas agendadas</span>
              <strong>{citasAgendadas}</strong>
              <span className="gerencia-kpi-meta">{citas.data.length} citas en el historial</span>
            </article>
          </section>

          <div className="gerencia-grid">
            <section aria-labelledby="gerencia-resumen-title" className="panel">
              <div className="panel-head">
                <div>
                  <p className="section-kicker">Cartera</p>
                  <h2 className="panel-title" id="gerencia-resumen-title">
                    Recaudo diario
                  </h2>
                </div>
                <span className="count-badge">{resumenOrdenado.length}</span>
              </div>
              {resumenOrdenado.length === 0 ? (
                <EmptyState icon="receipt" title="Sin movimiento de caja">
                  Cuando se emitan facturas, el recaudo aparecerá aquí.
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
                      {resumenOrdenado.map((day) => (
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

            <section aria-labelledby="gerencia-citas-title" className="panel">
              <div className="panel-head">
                <div>
                  <p className="section-kicker">Agenda</p>
                  <h2 className="panel-title" id="gerencia-citas-title">
                    Citas por estado
                  </h2>
                </div>
                <span className="count-badge">{citas.data.length}</span>
              </div>
              {citas.data.length === 0 ? (
                <EmptyState icon="calendar" title="Sin citas registradas">
                  La agenda se alimenta desde el módulo de admisión.
                </EmptyState>
              ) : (
                <ul className="gerencia-list">
                  {estadoRows.map((row) => (
                    <li key={row.label}>
                      <span className="gerencia-list-label">{row.label}</span>
                      <span className={`status-chip status-chip-${row.tone}`}>{row.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="gerencia-volumen-title" className="panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Operación</p>
                <h2 className="panel-title" id="gerencia-volumen-title">
                  Volumen de servicios
                </h2>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Módulo</th>
                    <th scope="col">Indicador</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {volumenRows.map((row) => (
                    <tr key={row.indicador}>
                      <td className="cell-strong" data-label="Módulo">
                        {row.modulo}
                      </td>
                      <td data-label="Indicador">{row.indicador}</td>
                      <td className="cell-number" data-label="Valor">
                        {row.valor}
                      </td>
                      <td className="cell-muted" data-label="Detalle">
                        {row.detalle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="panel-note gerencia-note">
              Resumen agregado de operación. Este módulo no consulta ni muestra historia clínica,
              diagnósticos ni datos identificables de pacientes.
            </p>
          </section>
        </>
      )}
    </ModulePage>
  )
}
