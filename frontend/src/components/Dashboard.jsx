import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import RouteGenerator from './RouteGenerator'
import RouteCard from './RouteCard'
import SolarSystem from './SolarSystem'
import StepProgress from './StepProgress'
import TrelloBoard from './TrelloBoard'

// Cada cuánto se consulta el detalle de una ruta en "generando" (ms).
const INTERVALO_POLLING = 2000

// Cada cuánto se revela un step nuevo en el sistema solar (ms).
const RETARDO_REVELADO_STEP = 700

// Dashboard
// Qué hace: página principal tras iniciar sesión. Muestra los datos del
// usuario autenticado, el formulario para generar nuevas rutas con IA
// (RouteGenerator, en una sección colapsable) y, para la ruta seleccionada,
// su visualización 3D en SolarSystem junto con la lista de rutas generadas.
// Mientras una ruta está en estado "generando", el Dashboard consulta su
// detalle cada 2 segundos y, cuando llega el resultado, revela sus steps
// progresivamente para que el SolarSystem los vaya materializando uno a uno.
// Por qué existe: es la pantalla a la que se redirige tras el login o el
// registro, y desde donde el usuario genera y visualiza sus rutas.
// Recibe: nada (usa el contexto de autenticación para leer el usuario).
// Devuelve: el bloque con la información del usuario, el generador de
// rutas, el sistema solar de la ruta seleccionada y la lista de rutas.
function Dashboard() {
  const { user, logout } = useAuth()
  const [rutas, setRutas] = useState([])
  const [cargandoRutas, setCargandoRutas] = useState(true)
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState(null)
  const [generadorVisible, setGeneradorVisible] = useState(true)
  const [stepTablero, setStepTablero] = useState(null)
  const [tasksTablero, setTasksTablero] = useState([])
  const timeoutsRevelado = useRef([])

  // handleStepSelect
  // Qué hace: se ejecuta cuando el usuario hace click en un planeta/step del
  // SolarSystem. Guarda ese step y sus tareas para mostrar, debajo del
  // sistema solar, su barra de progreso (StepProgress) y su tablero de
  // tareas tipo Trello (TrelloBoard).
  // Por qué existe: es el punto de comunicación entre el SolarSystem (que
  // detecta el click en un planeta) y el tablero de progreso de la Fase 5.
  // Recibe: step (el step pulsado, con sus tareas precargadas).
  // Devuelve: nada (sus efectos son actualizar "stepTablero" y "tasksTablero").
  const handleStepSelect = (step) => {
    setStepTablero(step)
    setTasksTablero(step.tasks || [])
  }

  // cargarRutas
  // Qué hace: pide al backend la lista de rutas del usuario autenticado
  // (GET /routes) y la guarda en el estado. Si todavía no hay ninguna ruta
  // seleccionada, selecciona la primera de la lista.
  // Por qué existe: se usa al montar el Dashboard y cada vez que
  // RouteGenerator genera una ruta nueva, para mantener la lista actualizada.
  // Recibe: nada.
  // Devuelve: nada (sus efectos son actualizar el estado "rutas" y
  // "rutaSeleccionadaId").
  const cargarRutas = useCallback(async () => {
    try {
      const response = await api.get('/routes')
      const rutasObtenidas = response.data.data.routes
      setRutas(rutasObtenidas)

      setRutaSeleccionadaId((actual) => {
        if (actual && rutasObtenidas.some((ruta) => ruta.id === actual)) {
          return actual
        }
        return rutasObtenidas.length > 0 ? rutasObtenidas[0].id : null
      })
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoRutas(false)
    }
  }, [])

  useEffect(() => {
    cargarRutas()
  }, [cargarRutas])

  // Limpia cualquier timeout de revelado pendiente al desmontar el Dashboard.
  useEffect(() => {
    const timeouts = timeoutsRevelado.current

    return () => {
      timeouts.forEach((id) => clearTimeout(id))
    }
  }, [])

  // revelarStepsProgresivamente
  // Qué hace: una vez que la IA ha terminado de generar una ruta (con todos
  // sus steps de golpe), va añadiendo esos steps al estado de uno en uno,
  // con un pequeño retardo entre cada uno. Así, en el SolarSystem, cada
  // planeta nuevo aparece con su animación de materialización por separado
  // en lugar de aparecer todos a la vez.
  // Recibe: rutaActualizada (la ruta ya completada, con todos sus steps).
  // Devuelve: nada (sus efectos son ir actualizando el estado "rutas").
  const revelarStepsProgresivamente = useCallback((rutaActualizada) => {
    const steps = rutaActualizada.steps || []

    if (steps.length === 0) {
      setRutas((previas) => previas.map((ruta) => (
        ruta.id === rutaActualizada.id ? rutaActualizada : ruta
      )))
      return
    }

    steps.forEach((_, indice) => {
      const id = setTimeout(() => {
        setRutas((previas) => previas.map((ruta) => (
          ruta.id === rutaActualizada.id
            ? { ...rutaActualizada, steps: steps.slice(0, indice + 1) }
            : ruta
        )))
      }, indice * RETARDO_REVELADO_STEP)

      timeoutsRevelado.current.push(id)
    })
  }, [])

  // Sondea el detalle de la ruta seleccionada mientras esté "generando", y
  // cuando termina (completada o error) revela sus steps progresivamente.
  useEffect(() => {
    const rutaSeleccionada = rutas.find((ruta) => ruta.id === rutaSeleccionadaId)

    if (!rutaSeleccionada || rutaSeleccionada.estado !== 'generando') {
      return
    }

    const intervalo = setInterval(async () => {
      try {
        const response = await api.get(`/routes/${rutaSeleccionada.id}`)
        const rutaActualizada = response.data.data.route

        if (rutaActualizada.estado !== 'generando') {
          clearInterval(intervalo)
          revelarStepsProgresivamente(rutaActualizada)
        }
      } catch (err) {
        console.error(err)
      }
    }, INTERVALO_POLLING)

    return () => clearInterval(intervalo)
  }, [rutas, rutaSeleccionadaId, revelarStepsProgresivamente])

  const rutaSeleccionada = rutas.find((ruta) => ruta.id === rutaSeleccionadaId) || null

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
        <button onClick={() => setGeneradorVisible((visible) => !visible)}>
          {generadorVisible ? 'Ocultar generador de rutas' : 'Generar nueva ruta'}
        </button>

        {generadorVisible && <RouteGenerator onRutaGenerada={cargarRutas} />}
      </section>

      <section>
        <h3>Tus rutas generadas</h3>

        {cargandoRutas ? (
          <p>Cargando rutas...</p>
        ) : rutas.length === 0 ? (
          <p>Todavía no has generado ninguna ruta.</p>
        ) : (
          <>
            {rutas.length > 1 && (
              <ul className="selector-rutas">
                {rutas.map((ruta) => (
                  <li key={ruta.id}>
                    <button
                      onClick={() => setRutaSeleccionadaId(ruta.id)}
                      disabled={ruta.id === rutaSeleccionadaId}
                    >
                      {ruta.titulo}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {rutaSeleccionada && (
              <SolarSystem route={rutaSeleccionada} onStepSelect={handleStepSelect} />
            )}

            {/* Tablero de progreso tipo Trello del step (planeta) seleccionado. */}
            {stepTablero && (
              <section className="tablero-progreso">
                <h3>Progreso: {stepTablero.titulo}</h3>
                <StepProgress tasks={tasksTablero} />
                <TrelloBoard step={stepTablero} onTasksChange={setTasksTablero} />
              </section>
            )}

            {rutas.map((ruta) => <RouteCard key={ruta.id} route={ruta} />)}
          </>
        )}
      </section>
    </div>
  )
}

export default Dashboard
