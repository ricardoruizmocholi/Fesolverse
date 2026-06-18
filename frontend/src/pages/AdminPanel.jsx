import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminDashboard from '../components/admin/AdminDashboard'
import AdminUsers from '../components/admin/AdminUsers'
import AdminBlockedIps from '../components/admin/AdminBlockedIps'
import AdminRoutes from '../components/admin/AdminRoutes'
import AdminPayments from '../components/admin/AdminPayments'

// Secciones disponibles en la navegación lateral del panel de admin, junto
// con el componente que muestra cada una.
const SECCIONES = [
  { id: 'dashboard', titulo: 'Dashboard', Componente: AdminDashboard },
  { id: 'usuarios', titulo: 'Usuarios', Componente: AdminUsers },
  { id: 'ips', titulo: 'IPs Bloqueadas', Componente: AdminBlockedIps },
  { id: 'rutas', titulo: 'Rutas', Componente: AdminRoutes },
  { id: 'pagos', titulo: 'Pagos', Componente: AdminPayments },
]

// AdminPanel
// Qué hace: página del panel de administración (Fase 6). Mientras se
// comprueba la sesión muestra un mensaje de carga; si no hay sesión o el
// usuario autenticado no tiene role === 'admin', redirige a /dashboard. Si
// es administrador, muestra una navegación lateral con las secciones del
// panel (Dashboard, Usuarios, IPs Bloqueadas, Rutas) y, debajo, el
// contenido de la sección activa.
// Por qué existe: punto de entrada único del panel de administración,
// accesible solo para usuarios con role === 'admin'.
// Recibe: nada (usa el contexto de autenticación).
// Devuelve: la navegación lateral y la sección activa, o un <Navigate>
// hacia /dashboard si el usuario no es administrador.
function AdminPanel() {
  const { user, loading } = useAuth()
  const [seccionActivaId, setSeccionActivaId] = useState(SECCIONES[0].id)

  if (loading) {
    return <p>Cargando...</p>
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const seccionActiva = SECCIONES.find((seccion) => seccion.id === seccionActivaId)
  const ContenidoSeccion = seccionActiva.Componente

  return (
    <div className="admin-panel">
      <nav className="admin-panel__menu">
        <h3>Panel de administración</h3>

        {SECCIONES.map((seccion) => (
          <button
            key={seccion.id}
            type="button"
            className={`admin-panel__enlace${seccion.id === seccionActivaId ? ' admin-panel__enlace--activo' : ''}`}
            onClick={() => setSeccionActivaId(seccion.id)}
          >
            {seccion.titulo}
          </button>
        ))}

        <Link to="/dashboard" className="admin-panel__enlace admin-panel__volver">
          Volver al Dashboard
        </Link>
      </nav>

      <div className="admin-panel__contenido">
        <h2>{seccionActiva.titulo}</h2>
        <ContenidoSeccion />
      </div>
    </div>
  )
}

export default AdminPanel
