import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ProtectedRoute
// Qué hace: protege rutas que requieren sesión iniciada. Mientras se
// comprueba si el token guardado es válido muestra un mensaje de carga;
// si no hay token (o no es válido), redirige a /login; si hay sesión,
// muestra el contenido recibido en "children".
// Por qué existe: evita que se pueda acceder a páginas como el Dashboard
// sin haber iniciado sesión, sin tener que repetir esta comprobación en
// cada página protegida.
// Recibe: children (el contenido a mostrar si el usuario está autenticado).
// Devuelve: children, un mensaje de carga, o un <Navigate> hacia /login.
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()

  if (loading) {
    return <p>Cargando...</p>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
