import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import RouteGenerator from './RouteGenerator'
import SolarSystem from './SolarSystem'
import MapView from './MapView'
import StepProgress from './StepProgress'
import TrelloBoard from './TrelloBoard'
import { BlossomCarousel } from '@blossom-carousel/react'
import '@blossom-carousel/core/style.css'

// Cada cuánto se consulta el detalle de una ruta en "generando" (ms).
const INTERVALO_POLLING = 2000

// Cada cuánto se revela un step nuevo en el sistema solar (ms).
const RETARDO_REVELADO_STEP = 700

// Dashboard
// Qué hace: página principal tras iniciar sesión. Muestra los datos del
// usuario autenticado, el formulario para generar nuevas rutas con IA
// (RouteGenerator, en una sección colapsable), la sección de plan y pagos
// (UpgradePlan si el plan es "free", o la insignia de Pro y el historial de
// pagos si es "pro") y, para la ruta seleccionada, su visualización 3D en
// SolarSystem junto con la lista de rutas generadas.
// Mientras una ruta está en estado "generando", el Dashboard consulta su
// detalle cada 2 segundos y, cuando llega el resultado, revela sus steps
// progresivamente para que el SolarSystem los vaya materializando uno a uno.
// Por qué existe: es la pantalla a la que se redirige tras el login o el
// registro, y desde donde el usuario genera y visualiza sus rutas, y
// gestiona su plan (Fase 7).
// Recibe: nada (usa el contexto de autenticación para leer el usuario).
// Devuelve: el bloque con la información del usuario, la sección de plan y
// pagos, el generador de rutas, el sistema solar de la ruta seleccionada y
// la lista de rutas.
function Dashboard() {
  const { user, logout } = useAuth()
  const [rutas, setRutas] = useState([])
  const [cargandoRutas, setCargandoRutas] = useState(true)
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState(null)
  const [generadorVisible, setGeneradorVisible] = useState(true)
  const [stepTablero, setStepTablero] = useState(null)
  const [tasksTablero, setTasksTablero] = useState([])
  const timeoutsRevelado = useRef([])
  // Ref al carrusel de selección de rutas: permite llamar a prev()/next()
  // desde los botones de flecha sin depender de estado de React.
  const carruselRef = useRef(null)

  // --- Estado de archivado ---
  // archivando: id de la ruta que está siendo archivada (deshabilita el botón).
  const [archivando, setArchivando] = useState(null)
  // mensajeArchivar: confirmación temporal tras archivar con éxito.
  const [mensajeArchivar, setMensajeArchivar] = useState('')
  // archivadasVisible: si la sección de rutas archivadas está expandida.
  const [archivadasVisible, setArchivadasVisible] = useState(false)
  // rutasArchivadas: lista cargada bajo demanda al expandir la sección.
  const [rutasArchivadas, setRutasArchivadas] = useState([])
  const [cargandoArchivadas, setCargandoArchivadas] = useState(false)
  // restaurando: id de la ruta que está siendo restaurada.
  const [restaurando, setRestaurando] = useState(null)

  // Vista activa para la ruta seleccionada: 'solar' (sistema solar 3D) o
  // 'mapa' (mapa de viaje). "transicionando" evita pulsar el botón de
  // cambio mientras la animación está en marcha, y "claseTransicion" guarda
  // la clase CSS de animación ('fade-out' / 'fade-in') que se aplica al
  // contenedor de la vista.
  const [vista, setVista] = useState('solar')
  const [transicionando, setTransicionando] = useState(false)
  const [claseTransicion, setClaseTransicion] = useState('')

  // Mientras la vista activa es el mapa, añade la clase "modo-mapa" a
  // <body>. App.css usa esa clase para cambiar el fondo a un azul-verdoso
  // oscuro (como ver la Tierra desde el espacio) y atenuar el StarField, con
  // una transición suave. Al volver al sistema solar, o al desmontar el
  // Dashboard, se quita la clase para no afectar al resto de la app.
  useEffect(() => {
    if (vista === 'mapa') {
      document.body.classList.add('modo-mapa')
    } else {
      document.body.classList.remove('modo-mapa')
    }

    return () => document.body.classList.remove('modo-mapa')
  }, [vista])

  // handleStepSelect
  // Qué hace: se ejecuta cuando el usuario hace click en un planeta/step del
  // SolarSystem. Guarda ese step y sus tareas para mostrar, debajo del
  // sistema solar, su barra de progreso (StepProgress) y su tablero de
  // tareas tipo Trello (TrelloBoard).
  const handleStepSelect = (step) => {
    setStepTablero(step)
    setTasksTablero(step.tasks || [])
  }

  // handleCambioVista
  // Qué hace: alterna entre la vista del sistema solar 3D y la del mapa de
  // viaje, con una transición de "fundido" (fade) entre ambas.
  const handleCambioVista = () => {
    setTransicionando(true)
    setClaseTransicion('fade-out')

    setTimeout(() => {
      setVista((actual) => (actual === 'solar' ? 'mapa' : 'solar'))
      setClaseTransicion('fade-in')

      setTimeout(() => {
        setTransicionando(false)
        setClaseTransicion('')
      }, 400)
    }, 400)
  }

  // cargarRutas
  // Qué hace: pide al backend la lista de rutas ACTIVAS del usuario (GET
  // /routes, sin ?archivadas, por lo que solo devuelve las no archivadas) y
  // la guarda en el estado. Si todavía no hay ninguna ruta seleccionada,
  // selecciona la primera de la lista.
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
  // con un pequeño retardo entre cada uno.
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

  // handleArchivar
  // Qué hace: envía POST /routes/{id}/archive, quita la ruta del carrusel
  // activo y selecciona automáticamente la primera ruta restante. Si la
  // sección de archivadas estaba expandida, añade la ruta archivada a esa
  // lista sin necesidad de recargarla desde el backend.
  const handleArchivar = async (rutaId) => {
    setArchivando(rutaId)

    try {
      const response = await api.post(`/routes/${rutaId}/archive`)
      const rutaArchivada = response.data.data.route

      const rutasRestantes = rutas.filter((r) => r.id !== rutaId)
      setRutas(rutasRestantes)
      setRutaSeleccionadaId(
        rutaSeleccionadaId === rutaId
          ? (rutasRestantes.length > 0 ? rutasRestantes[0].id : null)
          : rutaSeleccionadaId
      )

      // Actualizar lista de archivadas si ya estaba cargada.
      if (archivadasVisible) {
        setRutasArchivadas((prev) => [rutaArchivada, ...prev])
      }

      setMensajeArchivar('Ruta archivada. Puedes restaurarla desde "Rutas archivadas".')
      setTimeout(() => setMensajeArchivar(''), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setArchivando(null)
    }
  }

  // handleExpandirArchivadas
  // Qué hace: alterna la visibilidad de la sección de rutas archivadas. La
  // primera vez que se expande carga las rutas con GET /routes?archivadas=true.
  // Las expansiones siguientes reutilizan la lista ya cargada.
  const handleExpandirArchivadas = async () => {
    const abrir = !archivadasVisible
    setArchivadasVisible(abrir)

    if (abrir && rutasArchivadas.length === 0) {
      setCargandoArchivadas(true)

      try {
        const response = await api.get('/routes', { params: { archivadas: true } })
        setRutasArchivadas(response.data.data.routes)
      } catch (err) {
        console.error(err)
      } finally {
        setCargandoArchivadas(false)
      }
    }
  }

  // handleRestaurar
  // Qué hace: envía POST /routes/{id}/unarchive, mueve la ruta de la lista
  // de archivadas al carrusel activo y la selecciona automáticamente.
  const handleRestaurar = async (rutaId) => {
    setRestaurando(rutaId)

    try {
      const response = await api.post(`/routes/${rutaId}/unarchive`)
      const rutaRestaurada = response.data.data.route

      setRutasArchivadas((prev) => prev.filter((r) => r.id !== rutaId))
      setRutas((prev) => [rutaRestaurada, ...prev])
      setRutaSeleccionadaId(rutaRestaurada.id)
    } catch (err) {
      console.error(err)
    } finally {
      setRestaurando(null)
    }
  }

  const rutaSeleccionada = rutas.find((ruta) => ruta.id === rutaSeleccionadaId) || null

  return (
    <div className="dashboard">
      {user && (
        <div className="dashboard__welcome">
          <h2 className="dashboard__username">
            Bienvenido, {user.name}
            <span className={`plan-badge plan-badge--${user.plan} plan-badge--inline`}>
              {user.plan}
            </span>
          </h2>
        </div>
      )}

      <section className="dashboard__generator">
        <button className="btn-secondary dashboard__generator-toggle" onClick={() => setGeneradorVisible((visible) => !visible)}>
          {generadorVisible ? 'Ocultar generador de rutas' : 'Generar nueva ruta'}
        </button>

        {generadorVisible && <RouteGenerator onRutaGenerada={cargarRutas} />}
      </section>

      <section className="dashboard__rutas">
        <h3 className="dashboard__rutas-titulo">
          Tus rutas generadas
          {rutas.length > 0 && <span className="badge-count">{rutas.length}</span>}
        </h3>

        {/* Confirmación temporal tras archivar una ruta */}
        {mensajeArchivar && (
          <p className="dashboard__msg-archivar" role="status">{mensajeArchivar}</p>
        )}

        {cargandoRutas ? (
          <p>Cargando rutas...</p>
        ) : rutas.length === 0 ? (
          <p>Todavía no has generado ninguna ruta.</p>
        ) : (
          <>
            {/* Con una sola ruta no hace falta selector; con varias se
                muestra el carrusel BlossomCarousel con scroll y arrastre. */}
            {rutas.length > 1 && (
              <div className="selector-rutas-wrapper">
                <button
                  type="button"
                  className="selector-rutas__flecha selector-rutas__flecha--prev"
                  aria-label="Rutas anteriores"
                  onClick={() => carruselRef.current?.prev()}
                >
                  &#8249;
                </button>

                <BlossomCarousel
                  ref={carruselRef}
                  as="ul"
                  repeat={false}
                  className="selector-rutas"
                >
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
                </BlossomCarousel>

                <button
                  type="button"
                  className="selector-rutas__flecha selector-rutas__flecha--next"
                  aria-label="Rutas siguientes"
                  onClick={() => carruselRef.current?.next()}
                >
                  &#8250;
                </button>
              </div>
            )}

            {rutaSeleccionada && (
              <>
                {/* Cabecera de la ruta seleccionada: título, destino espacial,
                    dificultad y botón para archivarla. Archivar la oculta del
                    carrusel y la mueve a "Rutas archivadas" (15 días para restaurar). */}
                <div className="ruta-cabecera">
                  <div className="ruta-cabecera__info">
                    <span className="ruta-cabecera__titulo">{rutaSeleccionada.titulo}</span>
                    <span className="ruta-cabecera__meta">
                      {rutaSeleccionada.destino_espacial} · {rutaSeleccionada.dificultad}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary ruta-cabecera__archivar"
                    onClick={() => handleArchivar(rutaSeleccionada.id)}
                    disabled={archivando === rutaSeleccionada.id}
                    title="Archivar esta ruta (tienes 15 días para restaurarla)"
                  >
                    {archivando === rutaSeleccionada.id ? 'Archivando…' : 'Archivar'}
                  </button>
                </div>

                <div className={`vista-container ${claseTransicion}`}>
                  {/* SolarSystem y MapView permanecen siempre montados: se
                      ocultan con display:none / visibility:hidden en lugar de
                      desmontarse, para que el Canvas de Three.js no pierda
                      su contexto WebGL ni sus dimensiones al alternar vista. */}
                  <div style={{ display: vista === 'solar' ? 'block' : 'none' }}>
                    <SolarSystem route={rutaSeleccionada} onStepSelect={handleStepSelect} />
                  </div>
                  <div style={{ visibility: vista === 'mapa' ? 'visible' : 'hidden', height: vista === 'mapa' ? 'auto' : '0', overflow: 'hidden', position: vista === 'mapa' ? 'relative' : 'absolute' }}>
                    <MapView route={rutaSeleccionada} onBack={handleCambioVista} onStepSelect={handleStepSelect} visible={vista === 'mapa'} />
                  </div>

                  <button
                    type="button"
                    className="btn-switch-vista"
                    onClick={handleCambioVista}
                    disabled={transicionando}
                  >
                    {vista === 'solar' ? ' Ver como viaje' : ' Ver sistema solar'}
                  </button>
                </div>
              </>
            )}

            {/* Tablero de progreso tipo Trello del step (planeta) seleccionado. */}
            {stepTablero && (
              <section className="tablero-progreso">
                <h3>Progreso: {stepTablero.titulo}</h3>
                <StepProgress tasks={tasksTablero} />
                <TrelloBoard step={stepTablero} onTasksChange={setTasksTablero} />
              </section>
            )}

            {/* El detalle de los steps de cada ruta se visualiza en el
                SolarSystem (planetas) y en el MapView (marcadores de mapa),
                no como lista de texto plana. RouteCard.jsx se conserva
                por si se reutiliza en otro contexto. */}
          </>
        )}

        {/* Sección colapsable: Rutas archivadas.
            Carga con GET /routes?archivadas=true la primera vez que se abre.
            Cada ruta archivada muestra cuántos días lleva archivada y un
            botón "Restaurar" que la devuelve al carrusel activo. */}
        <div className="dashboard__archivadas">
          <button
            type="button"
            className="dashboard__archivadas-toggle"
            onClick={handleExpandirArchivadas}
          >
            Rutas archivadas
            {rutasArchivadas.length > 0 && (
              <span className="badge-count">{rutasArchivadas.length}</span>
            )}
            <span>{archivadasVisible ? ' ▲' : ' ▼'}</span>
          </button>

          {archivadasVisible && (
            <div className="archivadas-grid-wrapper">
              {cargandoArchivadas ? (
                <p>Cargando rutas archivadas…</p>
              ) : rutasArchivadas.length === 0 ? (
                <p className="archivadas-grid__vacio">No tienes rutas archivadas.</p>
              ) : (
                <div className="archivadas-grid">
                  {rutasArchivadas.map((ruta) => {
                    const diasArchivada = ruta.archivada_en
                      ? Math.floor(
                          (Date.now() - new Date(ruta.archivada_en).getTime()) / 86_400_000
                        )
                      : 0
                    const diasRestantes = Math.max(0, 15 - diasArchivada)

                    return (
                      <div key={ruta.id} className="archivada-card">
                        <div className="archivada-card__body">
                          <p className="archivada-card__titulo">{ruta.titulo}</p>
                          {ruta.destino_espacial && (
                            <span className="archivada-card__badge">
                              {ruta.destino_espacial}
                            </span>
                          )}
                          <p className="archivada-card__meta">
                            Archivada hace {diasArchivada} día{diasArchivada !== 1 ? 's' : ''}
                          </p>
                          {diasRestantes <= 5 && (
                            <p className="archivada-card__alerta">
                              Se eliminará en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-secondary archivada-card__restaurar"
                          onClick={() => handleRestaurar(ruta.id)}
                          disabled={restaurando === ruta.id}
                        >
                          {restaurando === ruta.id ? 'Restaurando…' : 'Restaurar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
