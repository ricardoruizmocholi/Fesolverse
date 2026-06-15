import { useEffect, useState } from 'react'
import api from '../../api/axios'

// AdminRoutes
// Qué hace: muestra la lista paginada de todas las rutas generadas por
// todos los usuarios (GET /admin/routes), con su título, destino espacial,
// dificultad, estado, usuario propietario y fecha de creación. Permite
// eliminar una ruta (con confirmación), lo que también elimina en cascada
// sus steps y tasks (DELETE /admin/routes/{id}).
// Por qué existe: es la sección "Rutas" del panel de administración
// (Fase 6), desde donde un administrador puede moderar rutas de cualquier
// usuario.
// Recibe: nada.
// Devuelve: la tabla de rutas y los controles de paginación, o un mensaje
// de carga/error/vacío.
function AdminRoutes() {
  const [rutas, setRutas] = useState([])
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Id de la ruta que se está eliminando, para desactivar su botón mientras
  // se espera la respuesta del backend.
  const [eliminando, setEliminando] = useState(null)

  // Carga la página de rutas actual cada vez que cambia la página.
  useEffect(() => {
    let activo = true

    const cargarRutas = async () => {
      setCargando(true)
      setError('')

      try {
        const response = await api.get('/admin/routes', { params: { page: paginaActual } })

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
  }, [paginaActual])

  // eliminar
  // Qué hace: pide confirmación y, si se confirma, elimina la ruta (DELETE
  // /admin/routes/{id}). Si tiene éxito, la quita de la lista local.
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

  if (cargando) {
    return <p>Cargando rutas...</p>
  }

  return (
    <div className="admin-rutas">
      {error && <p role="alert" className="admin-error">{error}</p>}

      {rutas.length === 0 ? (
        <p>No hay rutas generadas todavía.</p>
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
                  <td>
                    <button type="button" className="btn-danger" onClick={() => eliminar(ruta)} disabled={eliminando === ruta.id}>
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
