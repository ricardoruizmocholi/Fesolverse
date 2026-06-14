import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

// AdminUsers
// Qué hace: muestra la lista paginada de usuarios (GET /admin/users), con
// un buscador por nombre o email. Cada fila incluye sus datos básicos
// (plan, tokens usados, fecha de registro, nº de rutas) y un botón para
// bloquear o desbloquear la IP de registro del usuario, según si esa IP
// está actualmente en la lista de IPs bloqueadas (GET /admin/blocked-ips).
// Por qué existe: es la sección "Usuarios" del panel de administración
// (Fase 6), desde donde un administrador puede moderar usuarios.
// Recibe: nada (usa el contexto de autenticación para no mostrar el botón
// de bloqueo en la fila del propio administrador).
// Devuelve: el buscador, la tabla de usuarios y los controles de paginación.
function AdminUsers() {
  const { user: adminActual } = useAuth()

  const [usuarios, setUsuarios] = useState([])
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [ipsBloqueadas, setIpsBloqueadas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Id del usuario sobre el que se está bloqueando/desbloqueando, para
  // desactivar su botón mientras se espera la respuesta del backend.
  const [accionando, setAccionando] = useState(null)

  // Carga la página de usuarios actual cada vez que cambia la página o se
  // confirma una nueva búsqueda.
  useEffect(() => {
    let activo = true

    const cargarUsuarios = async () => {
      setCargando(true)
      setError('')

      try {
        const response = await api.get('/admin/users', {
          params: { page: paginaActual, search: busqueda || undefined },
        })

        if (activo) {
          const paginacion = response.data.data.users
          setUsuarios(paginacion.data)
          setTotalPaginas(paginacion.last_page)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar los usuarios.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarUsuarios()

    return () => { activo = false }
  }, [paginaActual, busqueda])

  // Carga la lista de IPs bloqueadas actualmente, para saber qué botón
  // (Bloquear IP / Desbloquear IP) mostrar en cada fila.
  useEffect(() => {
    let activo = true

    const cargarIpsBloqueadas = async () => {
      try {
        const response = await api.get('/admin/blocked-ips')

        if (activo) {
          setIpsBloqueadas(response.data.data.blocked_ips.map((bloqueo) => bloqueo.ip))
        }
      } catch {
        // Si falla, simplemente no se distinguirá qué usuarios están bloqueados.
      }
    }

    cargarIpsBloqueadas()

    return () => { activo = false }
  }, [])

  // handleBuscar
  // Qué hace: al enviar el formulario de búsqueda, vuelve a la página 1 y
  // confirma el texto del input como término de búsqueda, lo que dispara
  // la recarga de la tabla.
  const handleBuscar = (event) => {
    event.preventDefault()
    setPaginaActual(1)
    setBusqueda(busquedaInput.trim())
  }

  // bloquear
  // Qué hace: bloquea la IP de registro del usuario (POST
  // /admin/users/{id}/block). Si tiene éxito, añade esa IP a la lista local
  // de IPs bloqueadas para que el botón de esa fila cambie a "Desbloquear IP".
  const bloquear = async (usuario) => {
    setError('')
    setAccionando(usuario.id)

    try {
      await api.post(`/admin/users/${usuario.id}/block`)
      setIpsBloqueadas((previas) => [...previas, usuario.ip_registro])
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido bloquear al usuario.')
    } finally {
      setAccionando(null)
    }
  }

  // desbloquear
  // Qué hace: desbloquea la IP de registro del usuario (POST
  // /admin/users/{id}/unblock). Si tiene éxito, quita esa IP de la lista
  // local de IPs bloqueadas para que el botón de esa fila cambie a
  // "Bloquear IP".
  const desbloquear = async (usuario) => {
    setError('')
    setAccionando(usuario.id)

    try {
      await api.post(`/admin/users/${usuario.id}/unblock`)
      setIpsBloqueadas((previas) => previas.filter((ip) => ip !== usuario.ip_registro))
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido desbloquear al usuario.')
    } finally {
      setAccionando(null)
    }
  }

  return (
    <div className="admin-usuarios">
      <form className="admin-buscador" onSubmit={handleBuscar}>
        <input
          type="text"
          value={busquedaInput}
          onChange={(event) => setBusquedaInput(event.target.value)}
          placeholder="Buscar por nombre o email..."
        />
        <button type="submit">Buscar</button>
      </form>

      {error && <p role="alert" className="admin-error">{error}</p>}

      {cargando ? (
        <p>Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p>No se han encontrado usuarios.</p>
      ) : (
        <>
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Tokens usados</th>
                <th>Registro</th>
                <th>Rutas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const ipBloqueada = usuario.ip_registro && ipsBloqueadas.includes(usuario.ip_registro)
                const esUnoMismo = adminActual?.id === usuario.id

                return (
                  <tr key={usuario.id}>
                    <td>{usuario.name}</td>
                    <td>{usuario.email}</td>
                    <td>{usuario.plan}</td>
                    <td>{usuario.tokens_usados}</td>
                    <td>{new Date(usuario.created_at).toLocaleDateString()}</td>
                    <td>{usuario.routes_count}</td>
                    <td>
                      {/* El admin no puede bloquearse a sí mismo, ni se puede
                          bloquear a un usuario sin IP de registro. */}
                      {esUnoMismo || !usuario.ip_registro ? (
                        <span className="admin-tabla__sin-accion">—</span>
                      ) : ipBloqueada ? (
                        <button
                          type="button"
                          onClick={() => desbloquear(usuario)}
                          disabled={accionando === usuario.id}
                        >
                          Desbloquear IP
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => bloquear(usuario)}
                          disabled={accionando === usuario.id}
                        >
                          Bloquear IP
                        </button>
                      )}
                    </td>
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

export default AdminUsers
