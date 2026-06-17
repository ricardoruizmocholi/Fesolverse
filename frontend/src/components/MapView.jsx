import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useUserLocation from '../hooks/useUserLocation'
import { getDestinoCiudad } from '../utils/destinoCiudad'

// URL base de la API pública de OSRM (Open Source Routing Machine), usada
// para calcular rutas reales por carretera entre dos puntos sin necesidad de
// API key.
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

// Tiempo máximo de espera para la ruta completa origen→destino (solo se usa
// para repartir los marcadores de los steps sobre carreteras reales). Si se
// supera, se cancela la petición y los steps se reparten por interpolación
// lineal (ver "puntosSteps" más abajo).
const TIMEOUT_RUTA_COMPLETA_MS = 8000

// Tiempo máximo de espera por cada petición OSRM de un segmento de ruta. Si
// se supera, se cancela esa petición y el segmento se dibuja como línea
// recta discontinua.
const TIMEOUT_SEGMENTO_MS = 5000

// Número máximo de peticiones OSRM simultáneas, para no saturar el servidor
// público de OSRM con todas las peticiones de segmentos a la vez.
const MAX_PETICIONES_PARALELAS = 3

// interpolarPunto
// Qué hace: calcula un punto intermedio entre dos coordenadas mediante
// interpolación lineal simple, según una fracción "t" (0 = origen, 1 =
// destino). Se usa como alternativa para repartir los marcadores de los
// steps sobre la línea recta entre origen y destino, solo cuando OSRM no
// puede calcular la ruta completa entre ambos.
// Recibe: origen y destino ({ lat, lon }), y t (número entre 0 y 1).
// Devuelve: { lat, lon } del punto interpolado.
const interpolarPunto = (origen, destino, t) => ({
  lat: origen.lat + (destino.lat - origen.lat) * t,
  lon: origen.lon + (destino.lon - origen.lon) * t,
})

// extraerPuntosIntermedios
// Qué hace: dada la geometría completa de una ruta (array de puntos
// [lat, lon] devuelto por OSRM) y una cantidad de puntos a extraer, devuelve
// esa cantidad de puntos tomados a intervalos regulares de la geometría. Por
// ejemplo, con "cantidad" = 3 y una geometría de 100 puntos, devuelve los
// puntos en las posiciones 25, 50 y 75. Al pertenecer a la ruta real
// calculada por OSRM, estos puntos siempre caen sobre carreteras, nunca en
// el mar.
// Recibe: positions (array de [lat, lon]) y cantidad (número de puntos a
// extraer, uno por cada step de la ruta).
// Devuelve: un array de [lat, lon] de longitud "cantidad".
const extraerPuntosIntermedios = (positions, cantidad) => {
  const total = positions.length

  return Array.from({ length: cantidad }, (_, indice) => {
    const fraccion = (indice + 1) / (cantidad + 1)
    const posicion = Math.min(total - 1, Math.round(fraccion * total))
    return positions[posicion]
  })
}

// obtenerRutaSegmento
// Qué hace: pide a OSRM la ruta real por carretera entre dos puntos, con un
// límite de tiempo "timeoutMs". Si OSRM responde a tiempo y correctamente,
// devuelve las coordenadas de esa ruta (convertidas de [lon, lat], formato
// GeoJSON, a [lat, lon], formato Leaflet) con "esFallback: false". Si OSRM
// falla, no encuentra ruta (por ejemplo, un tramo sobre el mar) o tarda más
// de "timeoutMs" (se cancela con AbortController), devuelve una línea recta
// entre ambos puntos con "esFallback: true", para dibujarla discontinua.
// Recibe: origen y destino ({ lat, lon }) y timeoutMs (ms antes de cancelar
// la petición; por defecto, TIMEOUT_SEGMENTO_MS).
// Devuelve: una promesa que resuelve a { positions, esFallback }.
async function obtenerRutaSegmento(origen, destino, timeoutMs = TIMEOUT_SEGMENTO_MS) {
  const lineaRecta = {
    positions: [[origen.lat, origen.lon], [destino.lat, destino.lon]],
    esFallback: true,
  }

  const controlador = new AbortController()
  const idTimeout = setTimeout(() => controlador.abort(), timeoutMs)

  try {
    const url = `${OSRM_URL}/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=full&geometries=geojson`
    const respuesta = await fetch(url, { signal: controlador.signal })
    const datos = await respuesta.json()

    if (datos.code !== 'Ok' || !datos.routes?.[0]) {
      return lineaRecta
    }

    const positions = datos.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon])
    return { positions, esFallback: false }
  } catch {
    // Incluye tanto errores de red como el AbortError lanzado al superar
    // "timeoutMs": en ambos casos se usa la línea recta como alternativa.
    return lineaRecta
  } finally {
    clearTimeout(idTimeout)
  }
}

// AjustarVista
// Qué hace: componente auxiliar sin renderizado propio que ajusta el centro
// y el zoom del mapa con fitBounds, para que todos los puntos de la ruta
// (origen, steps y destino) queden visibles dentro del mapa.
// Recibe: puntos (array de { lat, lon }).
// Devuelve: null (no renderiza nada visible).
function AjustarVista({ puntos }) {
  const map = useMap()

  useEffect(() => {
    if (puntos.length === 0) return

    const bounds = L.latLngBounds(puntos.map((punto) => [punto.lat, punto.lon]))
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [map, puntos])

  return null
}

// SincronizarTamano
// Qué hace: detecta cuando el mapa pasa de oculto a visible (prop "visible"
// cambia a true) y llama a map.invalidateSize() tras 100ms para que Leaflet
// recalcule las dimensiones del contenedor. Es necesario porque el
// MapContainer se monta mientras el div padre tiene visibility:hidden y
// height:0, y Leaflet no puede calcular sus dimensiones correctamente hasta
// que el mapa se hace visible.
// Recibe: visible (booleano; true cuando el mapa está activo en el Dashboard).
// Devuelve: null (no renderiza nada visible).
function SincronizarTamano({ visible }) {
  const map = useMap()

  useEffect(() => {
    if (!visible) return
    const id = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(id)
  }, [map, visible])

  return null
}

// MapView
// Qué hace: vista alternativa al sistema solar 3D que representa la ruta de
// aprendizaje generada como un viaje sobre un mapa real. Dibuja un
// CircleMarker naranja en la ubicación del usuario (origen), un
// CircleMarker verde en una ciudad simbólica relacionada con el destino
// espacial de la ruta (destino) y un CircleMarker cian por cada step de la
// ruta, colocados sobre puntos de la ruta real origen→destino calculada por
// OSRM (o, si OSRM falla, repartidos proporcionalmente sobre la línea recta
// entre origen y destino). Entre cada par de puntos consecutivos se calcula
// con OSRM una ruta real por carretera (o, si OSRM falla, una línea recta
// discontinua).
// Recibe: route (ruta generada, con "titulo", "destino_espacial" y "steps"),
// onBack (función para volver a la vista del sistema solar), onStepSelect
// (función llamada con el step pulsado, para mostrar su tablero de tareas)
// y visible (booleano; true cuando el mapa es la vista activa, usado para
// llamar a map.invalidateSize() al hacerse visible).
// Devuelve: el contenedor del mapa, con sus marcadores, popups, las rutas
// por carretera y el botón para volver al sistema solar.
function MapView({ route, onBack, onStepSelect, visible }) {
  const { lat, lon } = useUserLocation()

  const origen = { lat, lon }
  const destino = getDestinoCiudad(route)

  // Si la ruta no tiene steps, "steps" queda como array vacío: el mapa
  // mostrará igualmente el origen, el destino y la ruta entre ambos.
  const steps = route?.steps || []

  // Clave para recalcular los puntos de los steps solo cuando cambian el
  // origen, el destino o el número de steps de la ruta.
  const claveOrigenDestino = `${origen.lat.toFixed(4)},${origen.lon.toFixed(4)}|${destino.lat.toFixed(4)},${destino.lon.toFixed(4)}|${steps.length}`

  // Puntos para los marcadores de los steps, extraídos de la geometría real
  // de la ruta origen→destino calculada por OSRM (uno por step). Mientras no
  // se hayan calculado, o si OSRM no encuentra ruta entre origen y destino,
  // queda en null y los steps se reparten por interpolación lineal como
  // alternativa (ver "puntosSteps" más abajo).
  const [puntosStepsRuta, setPuntosStepsRuta] = useState(null)

  // Calcula la ruta completa origen→destino con OSRM y, a partir de su
  // geometría, extrae un punto por cada step mediante "extraerPuntosIntermedios"
  // (a intervalos regulares, p. ej. posiciones 25, 50 y 75 de 100 para 3
  // steps). Así los marcadores de los steps caen siempre sobre carreteras
  // reales y nunca en el mar. Si la ruta no tiene steps no hace falta pedir
  // nada a OSRM.
  useEffect(() => {
    let activo = true

    if (steps.length === 0) {
      return () => { activo = false }
    }

    // Se usa TIMEOUT_RUTA_COMPLETA_MS (8s): si OSRM tarda más, se cancela y
    // los steps se reparten por interpolación lineal (puntosStepsRuta queda
    // en null), sin bloquear el resto del mapa.
    obtenerRutaSegmento(origen, destino, TIMEOUT_RUTA_COMPLETA_MS).then((ruta) => {
      if (!activo) return

      // Si OSRM no encuentra ruta entre origen y destino (esFallback), se
      // mantiene el reparto por interpolación lineal como alternativa.
      if (ruta.esFallback) {
        setPuntosStepsRuta(null)
        return
      }

      setPuntosStepsRuta(extraerPuntosIntermedios(ruta.positions, steps.length))
    })

    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveOrigenDestino])

  // Posición de cada step: si OSRM pudo calcular la ruta origen→destino, se
  // usa el punto correspondiente extraído de su geometría (siempre sobre
  // tierra); si no, se reparte por interpolación lineal sobre la línea recta
  // entre origen y destino (comportamiento anterior, usado como alternativa).
  const puntosSteps = steps.map((step, indice) => {
    const puntoRuta = puntosStepsRuta?.[indice]

    const posicion = puntoRuta
      ? { lat: puntoRuta[0], lon: puntoRuta[1] }
      : interpolarPunto(origen, destino, (indice + 1) / (steps.length + 1))

    return { ...posicion, step }
  })

  // Todos los puntos del viaje, en orden: origen, steps y destino. Se usan
  // para calcular los límites visibles del mapa y para construir los
  // segmentos de ruta entre puntos consecutivos.
  const puntosRuta = [origen, ...puntosSteps, { ...destino }]

  // Clave estable (basada en las coordenadas) para volver a calcular las
  // rutas de OSRM solo cuando cambian los puntos del viaje, no en cada
  // renderizado.
  const clavePuntos = puntosRuta.map((punto) => `${punto.lat.toFixed(4)},${punto.lon.toFixed(4)}`).join('|')

  // Pares de puntos consecutivos (origen→step1, step1→step2, ...,
  // stepN→destino), uno por cada segmento de ruta a calcular con OSRM.
  const pares = []
  for (let i = 0; i < puntosRuta.length - 1; i += 1) {
    pares.push([puntosRuta[i], puntosRuta[i + 1]])
  }

  // Líneas rectas provisionales para todos los segmentos del viaje actual:
  // se muestran de inmediato (con "cargando: true") mientras OSRM calcula
  // las rutas reales en segundo plano, para que el mapa sea usable desde el
  // primer renderizado.
  const segmentosIniciales = pares.map(([a, b]) => ({
    positions: [[a.lat, a.lon], [b.lat, b.lon]],
    esFallback: true,
    cargando: true,
  }))

  // Resultado de OSRM para los puntos del viaje: "clave" identifica para qué
  // "clavePuntos" se calcularon "segmentos". Mientras no coincida con la
  // "clavePuntos" actual, se usan "segmentosIniciales" como alternativa.
  const [rutaCalculada, setRutaCalculada] = useState(null)

  // Al montar el componente (o cuando cambian los puntos del viaje), pide a
  // OSRM la ruta real por carretera de cada segmento. Para no saturar el
  // servidor público de OSRM, las peticiones se agrupan en bloques de
  // MAX_PETICIONES_PARALELAS (3) y se resuelven con Promise.allSettled
  // bloque a bloque, en lugar de todas a la vez. Cada segmento empieza como
  // línea recta provisional y se sustituye por la ruta real de OSRM en
  // cuanto su bloque resuelve. Si una petición falla, se rechaza o supera
  // TIMEOUT_SEGMENTO_MS, ese segmento se queda como línea recta discontinua.
  useEffect(() => {
    let activo = true

    const procesarSegmentos = async () => {
      for (let inicio = 0; inicio < pares.length; inicio += MAX_PETICIONES_PARALELAS) {
        if (!activo) return

        const bloque = pares.slice(inicio, inicio + MAX_PETICIONES_PARALELAS)
        const resultados = await Promise.allSettled(
          bloque.map(([a, b]) => obtenerRutaSegmento(a, b, TIMEOUT_SEGMENTO_MS))
        )

        if (!activo) return

        setRutaCalculada((actual) => {
          const base = actual?.clave === clavePuntos ? actual.segmentos : segmentosIniciales
          const nuevosSegmentos = [...base]

          resultados.forEach((resultado, indiceBloque) => {
            const indice = inicio + indiceBloque

            nuevosSegmentos[indice] = resultado.status === 'fulfilled'
              ? { ...resultado.value, cargando: false }
              : { ...nuevosSegmentos[indice], cargando: false }
          })

          return { clave: clavePuntos, segmentos: nuevosSegmentos }
        })
      }
    }

    procesarSegmentos()

    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePuntos])

  // "segmentos" siempre tiene un valor (líneas rectas provisionales o rutas
  // reales) para que el mapa muestre algo desde el primer renderizado.
  // "cargandoRuta" solo es true mientras quede algún segmento por resolver,
  // y controla el aviso "Calculando ruta...".
  const segmentos = rutaCalculada?.clave === clavePuntos ? rutaCalculada.segmentos : segmentosIniciales
  const cargandoRuta = segmentos.some((segmento) => segmento.cargando)

  return (
    <div className="mapa-viaje" style={{ position: 'relative' }}>
      <button type="button" className="btn-volver-universo" onClick={onBack}>
        ← Volver al universo
      </button>

      {cargandoRuta && (
        <div className="mapa-viaje__cargando">Calculando ruta...</div>
      )}

      <MapContainer
        center={[origen.lat, origen.lon]}
        zoom={4}
        scrollWheelZoom
        style={{ height: '600px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
      >
        {/* Mapa base oscuro de CartoDB, gratuito y sin necesidad de API key */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Ajusta el zoom y el centro para que origen y destino sean visibles */}
        <AjustarVista puntos={puntosRuta} />

        {/* Recalcula las dimensiones del mapa al hacerse visible, para
            compensar que el MapContainer se montó con el contenedor oculto */}
        <SincronizarTamano visible={visible} />

        {/* Rutas por carretera entre cada par de puntos consecutivos. Las
            calculadas con OSRM se dibujan continuas; los tramos donde OSRM
            no encuentra ruta (p. ej. sobre el mar) se dibujan discontinuos. */}
        {segmentos.map((segmento, indice) => (
          <Polyline
            key={indice}
            positions={segmento.positions}
            color="#38bdf8"
            weight={segmento.esFallback ? 2 : 3}
            opacity={segmento.esFallback ? 0.5 : 0.8}
            dashArray={segmento.esFallback ? '8 8' : null}
          />
        ))}

        {/* Marcador de origen: ubicación detectada del usuario */}
        <CircleMarker center={[origen.lat, origen.lon]} radius={10} color="#f97316" fillColor="#f97316" fillOpacity={0.9}>
          <Popup>Tu punto de partida</Popup>
        </CircleMarker>

        {/* Marcador de destino: ciudad simbólica del destino espacial de la ruta */}
        <CircleMarker center={[destino.lat, destino.lon]} radius={12} color="#22c55e" fillColor="#22c55e" fillOpacity={0.9}>
          <Popup>{destino.ciudad}</Popup>
        </CircleMarker>

        {/* Un marcador por cada step de la ruta. Al hacer click muestra su
            popup y avisa al Dashboard (onStepSelect) para abrir su tablero
            de tareas debajo del mapa. */}
        {puntosSteps.map(({ lat: stepLat, lon: stepLon, step }) => (
          <CircleMarker
            key={step.id ?? step.orden}
            center={[stepLat, stepLon]}
            radius={7}
            color="#38bdf8"
            fillColor="#38bdf8"
            fillOpacity={0.8}
            eventHandlers={{ click: () => onStepSelect?.(step) }}
          >
            <Popup>
              <strong>Paso {step.orden}: {step.titulo}</strong>
              <br />
              {step.tiempo_estimado_semanas} semana{step.tiempo_estimado_semanas === 1 ? '' : 's'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

export default MapView
