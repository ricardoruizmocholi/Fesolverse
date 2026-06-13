import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import RouteGenerator from './RouteGenerator'
import RouteCard from './RouteCard'

function Dashboard() {
  const { user, logout } = useAuth()
  const [rutas, setRutas] = useState([])
  const [cargandoRutas, setCargandoRutas] = useState(true)

  const cargarRutas = useCallback(async () => {
    try {
      const response = await api.get('/routes')
      setRutas(response.data.data.routes)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoRutas(false)
    }
  }, [])

  useEffect(() => {
    cargarRutas()
  }, [cargarRutas])

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

      <p>--- aquí va el generador ---</p>

      <RouteGenerator onRutaGenerada={cargarRutas} />

      <section>
        <h3>Tus rutas generadas</h3>
        {cargandoRutas ? (
          <p>Cargando rutas...</p>
        ) : rutas.length === 0 ? (
          <p>Todavía no has generado ninguna ruta.</p>
        ) : (
          rutas.map((ruta) => <RouteCard key={ruta.id} route={ruta} />)
        )}
      </section>
    </div>
  )
}

export default Dashboard