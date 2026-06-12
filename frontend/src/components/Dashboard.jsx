import { useAuth } from '../context/AuthContext'

// Dashboard
// Qué hace: página principal tras iniciar sesión. Muestra los datos del
// usuario autenticado (nombre, email, plan y tokens usados) y la lista de
// rutas profesionales generadas por el usuario (de momento vacía, se
// completará en una fase posterior del proyecto).
// Por qué existe: es la pantalla a la que se redirige tras el login o el
// registro, y desde donde el usuario accederá al resto de funcionalidades.
// Recibe: nada (usa el contexto de autenticación para leer el usuario).
// Devuelve: el bloque con la información del usuario y sus rutas generadas.
function Dashboard() {
  const { user, logout } = useAuth()

  // rutasGeneradas
  // Por qué existe: marcador de posición para las rutas profesionales que
  // el usuario generará en una fase posterior del proyecto. De momento
  // siempre está vacío.
  const rutasGeneradas = []

  return (
    <div>
      <h2>Dashboard</h2>

      {user && (
        <div>
          <p>Bienvenido, {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Plan: {user.plan}</p>
          <p>Tokens usados: {user.tokens_usados}</p>
        </div>
      )}

      <button onClick={logout}>Cerrar sesión</button>

      <section>
        <h3>Tus rutas generadas</h3>
        {rutasGeneradas.length === 0 ? (
          <p>Todavía no has generado ninguna ruta.</p>
        ) : (
          <ul>
            {rutasGeneradas.map((ruta) => (
              <li key={ruta.id}>{ruta.titulo}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Dashboard
