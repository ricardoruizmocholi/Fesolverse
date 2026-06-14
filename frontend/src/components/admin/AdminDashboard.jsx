import { useEffect, useState } from 'react'
import api from '../../api/axios'

// AdminDashboard
// Qué hace: carga las estadísticas generales de la plataforma
// (GET /admin/dashboard) y las muestra como tarjetas (total de usuarios,
// usuarios nuevos esta semana, rutas generadas, rutas de esta semana e IPs
// bloqueadas), junto con un gráfico simple en CSS del reparto de usuarios
// por plan (free vs pro).
// Por qué existe: es la sección "Dashboard" del panel de administración
// (Fase 6), la vista general al entrar al panel.
// Recibe: nada.
// Devuelve: las tarjetas de estadísticas y el gráfico de planes, o un
// mensaje de carga/error mientras se obtienen los datos.
function AdminDashboard() {
  const [estadisticas, setEstadisticas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Carga las estadísticas generales al montar la sección.
  useEffect(() => {
    let activo = true

    const cargarEstadisticas = async () => {
      setCargando(true)
      setError('')

      try {
        const response = await api.get('/admin/dashboard')

        if (activo) {
          setEstadisticas(response.data.data)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar las estadísticas.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarEstadisticas()

    return () => { activo = false }
  }, [])

  if (cargando) {
    return <p>Cargando estadísticas...</p>
  }

  if (error) {
    return <p role="alert" className="admin-error">{error}</p>
  }

  if (!estadisticas) {
    return null
  }

  const { free, pro } = estadisticas.usuarios_por_plan
  const totalPlanes = free + pro
  // Porcentajes del gráfico de barras free/pro (0 si todavía no hay usuarios).
  const porcentajeFree = totalPlanes === 0 ? 0 : Math.round((free / totalPlanes) * 100)
  const porcentajePro = 100 - porcentajeFree

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__tarjetas">
        <div className="admin-tarjeta">
          <p className="admin-tarjeta__valor">{estadisticas.total_usuarios}</p>
          <p className="admin-tarjeta__etiqueta">Usuarios totales</p>
        </div>
        <div className="admin-tarjeta">
          <p className="admin-tarjeta__valor">{estadisticas.usuarios_nuevos_semana}</p>
          <p className="admin-tarjeta__etiqueta">Usuarios nuevos esta semana</p>
        </div>
        <div className="admin-tarjeta">
          <p className="admin-tarjeta__valor">{estadisticas.total_rutas}</p>
          <p className="admin-tarjeta__etiqueta">Rutas generadas</p>
        </div>
        <div className="admin-tarjeta">
          <p className="admin-tarjeta__valor">{estadisticas.rutas_nuevas_semana}</p>
          <p className="admin-tarjeta__etiqueta">Rutas esta semana</p>
        </div>
        <div className="admin-tarjeta">
          <p className="admin-tarjeta__valor">{estadisticas.ips_bloqueadas}</p>
          <p className="admin-tarjeta__etiqueta">IPs bloqueadas</p>
        </div>
      </div>

      <div className="admin-dashboard__plan">
        <h4>Usuarios por plan</h4>

        <div className="admin-barra-plan">
          {porcentajeFree > 0 && (
            <div className="admin-barra-plan__free" style={{ width: `${porcentajeFree}%` }}>
              Free
            </div>
          )}
          {porcentajePro > 0 && (
            <div className="admin-barra-plan__pro" style={{ width: `${porcentajePro}%` }}>
              Pro
            </div>
          )}
        </div>

        <p className="admin-dashboard__plan-texto">
          Free: {free} ({porcentajeFree}%) — Pro: {pro} ({porcentajePro}%)
        </p>
      </div>
    </div>
  )
}

export default AdminDashboard
