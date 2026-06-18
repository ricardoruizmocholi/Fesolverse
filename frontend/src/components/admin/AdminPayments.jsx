import { useEffect, useState } from 'react'
import api from '../../api/axios'

// ETIQUETA_ESTADO
// Mapea el valor del campo "estado" del pago a la etiqueta legible y al
// modificador CSS del badge de color.
const ETIQUETA_ESTADO = {
  completed: { label: 'Completado', mod: 'verde' },
  pending:   { label: 'Pendiente',  mod: 'amarillo' },
  failed:    { label: 'Fallido',    mod: 'rojo' },
}

// AdminPayments
// Qué hace: muestra el historial de pagos de TODOS los usuarios
// (GET /admin/payments) con estadísticas globales (total recaudado, pagos
// completados/fallidos), filtros por estado y búsqueda por nombre/email, y
// paginación.
// Por qué existe: es la sección "Pagos" del panel de administración, donde
// un administrador puede supervisar la actividad económica de la plataforma.
// Recibe: nada.
// Devuelve: tarjetas de estadísticas, filtros, tabla de pagos y paginación.
function AdminPayments() {
  const [pagos, setPagos] = useState([])
  const [stats, setStats] = useState(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Filtros: estado del pago y búsqueda por nombre/email del usuario.
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Carga los pagos cada vez que cambia la página, el filtro o la búsqueda.
  useEffect(() => {
    let activo = true

    const cargarPagos = async () => {
      setCargando(true)
      setError('')

      try {
        const params = { page: paginaActual }
        if (filtroEstado) params.estado = filtroEstado
        if (busqueda) params.busqueda = busqueda

        const response = await api.get('/admin/payments', { params })

        if (activo) {
          const data = response.data.data
          const paginacion = data.payments
          setPagos(paginacion.data)
          setTotalPaginas(paginacion.last_page)
          setStats(data.stats)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar los pagos.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarPagos()

    return () => { activo = false }
  }, [paginaActual, filtroEstado, busqueda])

  // handleBuscar
  // Qué hace: confirma la búsqueda y resetea la paginación.
  const handleBuscar = (event) => {
    event.preventDefault()
    setPaginaActual(1)
    setBusqueda(busquedaInput.trim())
  }

  // handleFiltroEstado
  // Qué hace: actualiza el filtro de estado y resetea la paginación.
  const handleFiltroEstado = (nuevoEstado) => {
    setFiltroEstado(nuevoEstado)
    setPaginaActual(1)
  }

  return (
    <div className="admin-payments">
      {error && <p role="alert" className="admin-error">{error}</p>}

      {/* Tarjetas de estadísticas globales */}
      {stats && (
        <div className="admin-dashboard__tarjetas">
          <div className="admin-tarjeta">
            <p className="admin-tarjeta__valor admin-payments__recaudado">
              {stats.total_recaudado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <p className="admin-tarjeta__etiqueta">Total recaudado</p>
          </div>
          <div className="admin-tarjeta">
            <p className="admin-tarjeta__valor">{stats.total_pagos}</p>
            <p className="admin-tarjeta__etiqueta">Total pagos</p>
          </div>
          <div className="admin-tarjeta">
            <p className="admin-tarjeta__valor admin-payments__completados">
              {stats.pagos_completados}
            </p>
            <p className="admin-tarjeta__etiqueta">Completados</p>
          </div>
          <div className="admin-tarjeta">
            <p className="admin-tarjeta__valor admin-payments__fallidos">
              {stats.pagos_fallidos}
            </p>
            <p className="admin-tarjeta__etiqueta">Fallidos</p>
          </div>
        </div>
      )}

      {/* Filtros: buscador + selector de estado */}
      <div className="admin-payments__filtros">
        <form className="admin-buscador" onSubmit={handleBuscar}>
          <input
            type="text"
            value={busquedaInput}
            onChange={(event) => setBusquedaInput(event.target.value)}
            placeholder="Buscar por nombre o email..."
          />
          <button type="submit" className="btn-secondary">Buscar</button>
        </form>

        <div className="admin-payments__estado-filtro">
          {[
            { valor: '',          label: 'Todos' },
            { valor: 'completed', label: 'Completado' },
            { valor: 'pending',   label: 'Pendiente' },
            { valor: 'failed',    label: 'Fallido' },
          ].map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              className={`admin-tab${filtroEstado === opcion.valor ? ' admin-tab--activo' : ''}`}
              onClick={() => handleFiltroEstado(opcion.valor)}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de pagos */}
      {cargando ? (
        <p>Cargando pagos...</p>
      ) : pagos.length === 0 ? (
        <p>No se han encontrado pagos.</p>
      ) : (
        <>
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Importe</th>
                <th>Estado</th>
                <th>ID Transacción</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => {
                const estado = ETIQUETA_ESTADO[pago.estado] ?? { label: pago.estado, mod: 'amarillo' }
                // amount viene en céntimos desde el backend.
                const importe = (pago.amount / 100).toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                })

                return (
                  <tr key={pago.id}>
                    <td>{pago.user?.name ?? '—'}</td>
                    <td>{pago.user?.email ?? '—'}</td>
                    <td>{importe} {pago.currency?.toUpperCase()}</td>
                    <td>
                      <span className={`admin-payments__badge admin-payments__badge--${estado.mod}`}>
                        {estado.label}
                      </span>
                    </td>
                    <td
                      title={pago.stripe_payment_intent_id}
                      className="admin-payments__txid"
                    >
                      {pago.stripe_payment_intent_id
                        ? pago.stripe_payment_intent_id.slice(0, 20) + (pago.stripe_payment_intent_id.length > 20 ? '…' : '')
                        : '—'}
                    </td>
                    <td>{new Date(pago.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="admin-paginacion">
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => pagina - 1)}
              disabled={paginaActual <= 1}
            >
              Anterior
            </button>
            <span>Página {paginaActual} de {totalPaginas}</span>
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => pagina + 1)}
              disabled={paginaActual >= totalPaginas}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminPayments
