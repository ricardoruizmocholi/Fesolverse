import { useEffect, useState } from 'react'
import api from '../../api/axios'

// AdminRoutes
// Qué hace: muestra la lista paginada de rutas generadas por todos los
// usuarios, con dos tabs: "Rutas activas" y "Rutas archivadas".
//
// — Tab activas (GET /admin/routes): permite eliminar y archivar cualquier
//   ruta (sin restricción de propietario).
//
// — Tab archivadas (GET /admin/routes?archivadas=true): muestra la fecha
//   de archivado y los días restantes hasta la eliminación automática (en
//   rojo si quedan menos de 3). También incluye el botón "Limpiar archivadas
//   caducadas ahora" que invoca POST /admin/routes/limpiar-caducadas.
//
// Por qué existe: es la sección "Rutas" del panel de administración, desde
// donde un administrador puede moderar rutas de cualquier usuario.
// Recibe: nada.
// Devuelve: los tabs, la tabla de rutas, los controles de paginación y el
// botón de limpieza manual.
function AdminRoutes() {
  // 'activas' | 'archivadas'
  const [tabActiva, setTabActiva] = useState('activas')
  const [rutas, setRutas] = useState([])
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Id de la ruta que se está eliminando/archivando para deshabilitar su botón.
  const [eliminando, setEliminando] = useState(null)
  const [archivando, setArchivando] = useState(null)
  // Estado del botón de limpieza manual: null | 'limpiando' | número de eliminadas.
  const [limpieza, setLimpieza] = useState(null)

  // Recarga la página actual de rutas cada vez que cambia el tab o la página.
  useEffect(() => {
    let activo = true

    const cargarRutas = async () => {
      setCargando(true)
      setError('')

      try {
        const params = { page: paginaActual }
        if (tabActiva === 'archivadas') params.archivadas = true

        const response = await api.get('/admin/routes', { params })

        if (activo) {
          const paginacion = response.data.data.routes
          setRutas(paginacion.data)
          setTotalPaginas(paginacion.last_page)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar las rutas.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarRutas()

    return () => { activo = false }
  }, [paginaActual, tabActiva])

  // cambiarTab
  // Qué hace: cambia el tab activo y resetea la paginación a la primera página.
  const cambiarTab = (nuevoTab) => {
    setTabActiva(nuevoTab)
    setPaginaActual(1)
    setLimpieza(null)
  }

  // eliminar
  // Qué hace: pide confirmación y elimina la ruta (DELETE /admin/routes/{id}).
  // Si tiene éxito la quita de la lista local sin recargar.
  const eliminar = async (ruta) => {
    const confirmacion = window.confirm(
      `¿Eliminar la ruta "${ruta.titulo}" de ${ruta.user?.email}? Esta acción no se puede deshacer.`
    )
    if (!confirmacion) return

    setError('')
    setEliminando(ruta.id)

    try {
      await api.delete(`/admin/routes/${ruta.id}`)
      setRutas((previas) => previas.filter((r) => r.id !== ruta.id))
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido eliminar la ruta.')
    } finally {
      setEliminando(null)
    }
  }

  // archivar
  // Qué hace: archiva una ruta activa (POST /admin/routes/{id}/archive) sin
  // comprobar el propietario, ya que el admin tiene acceso a todas las rutas.
  // Mueve la ruta al tab de archivadas actualizándola localmente.
  const archivar = async (ruta) => {
    setError('')
    setArchivando(ruta.id)

    try {
      await api.post(`/admin/routes/${ruta.id}/archive`)
      // Quita la ruta del listado de activas.
      setRutas((previas) => previas.filter((r) => r.id !== ruta.id))
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido archivar la ruta.')
    } finally {
      setArchivando(null)
    }
  }

  // limpiarCaducadas
  // Qué hace: llama a POST /admin/routes/limpiar-caducadas para eliminar
  // inmediatamente las rutas archivadas que llevan más de 15 días. Muestra
  // cuántas se eliminaron y recarga el listado.
  const limpiarCaducadas = async () => {
    setLimpieza('limpiando')
    setError('')

    try {
      const response = await api.post('/admin/routes/limpiar-caducadas')
      const eliminadas = response.data.data.eliminadas
      setLimpieza(eliminadas)
      // Recargar el listado para reflejar las rutas eliminadas.
      setPaginaActual(1)
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido ejecutar la limpieza.')
      setLimpieza(null)
    }
  }

  if (cargando) {
    return <p>Cargando rutas...</p>
  }

  return (
    <div className="admin-rutas">
      {error && <p role="alert" className="admin-error">{error}</p>}

      {/* Tabs: Rutas activas / Rutas archivadas */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${tabActiva === 'activas' ? ' admin-tab--activo' : ''}`}
          onClick={() => cambiarTab('activas')}
        >
          Rutas activas
        </button>
        <button
          type="button"
          className={`admin-tab${tabActiva === 'archivadas' ? ' admin-tab--activo' : ''}`}
          onClick={() => cambiarTab('archivadas')}
        >
          Rutas archivadas
        </button>
      </div>

      {/* Botón de limpieza manual: solo visible en el tab de archivadas */}
      {tabActiva === 'archivadas' && (
        <div className="admin-limpieza">
          <button
            type="button"
            className="btn-danger"
            onClick={limpiarCaducadas}
            disabled={limpieza === 'limpiando'}
          >
            {limpieza === 'limpiando'
              ? 'Limpiando…'
              : 'Limpiar archivadas caducadas ahora'}
          </button>
          {typeof limpieza === 'number' && (
            <span className="admin-limpieza__resultado">
              Se eliminaron {limpieza} ruta{limpieza !== 1 ? 's' : ''}.
            </span>
          )}
        </div>
      )}

      {rutas.length === 0 ? (
        <p>
          {tabActiva === 'archivadas'
            ? 'No hay rutas archivadas.'
            : 'No hay rutas activas generadas todavía.'}
        </p>
      ) : (
        <>
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Destino espacial</th>
                <th>Dificultad</th>
                <th>Estado</th>
                <th>Usuario</th>
                <th>Fecha</th>
                {/* Columnas extra solo en el tab de archivadas */}
                {tabActiva === 'archivadas' && (
                  <>
                    <th>Archivada el</th>
                    <th>Días restantes</th>
                  </>
                )}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rutas.map((ruta) => (
                <tr key={ruta.id}>
                  <td>{ruta.titulo}</td>
                  <td>{ruta.destino_espacial}</td>
                  <td>{ruta.dificultad}</td>
                  <td>{ruta.estado}</td>
                  <td>{ruta.user?.name} ({ruta.user?.email})</td>
                  <td>{new Date(ruta.created_at).toLocaleDateString()}</td>

                  {/* Columnas de archivado */}
                  {tabActiva === 'archivadas' && (
                    <>
                      <td>
                        {ruta.archivada_en
                          ? new Date(ruta.archivada_en).toLocaleDateString()
                          : '—'}
                      </td>
                      <td
                        style={{
                          color: ruta.dias_restantes <= 3 ? '#f87171' : 'inherit',
                          fontWeight: ruta.dias_restantes <= 3 ? '700' : 'normal',
                        }}
                      >
                        {ruta.dias_restantes ?? '—'}
                      </td>
                    </>
                  )}

                  <td className="admin-tabla__acciones">
                    {/* En tab activas: botones Archivar + Eliminar */}
                    {tabActiva === 'activas' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => archivar(ruta)}
                        disabled={archivando === ruta.id}
                        style={{ marginRight: '0.5rem' }}
                      >
                        {archivando === ruta.id ? '…' : 'Archivar'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => eliminar(ruta)}
                      disabled={eliminando === ruta.id}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
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

export default AdminRoutes
