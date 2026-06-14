import { Component, Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Billboard, Line, OrbitControls, Stars, Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'


// ---------------------------------------------------------------------
// Configuración visual del sistema solar
// ---------------------------------------------------------------------

// PALETA_PASOS
// Por qué existe: cada planeta de un step necesita un color distinto según
// su orden, siguiendo la paleta pedida (azul, verde, naranja, morado, rojo,
// cian, rosa). Si hubiera más de 7 steps, la paleta se repite.
const PALETA_PASOS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4', '#ec4899']

// DESTINOS_ESPACIALES
// Por qué existe: define el color, el tamaño, si tiene anillos y la textura
// de cada uno de los posibles valores de "destino_espacial" que puede
// devolver la IA. El campo "textura" es la URL de la imagen del planeta
// (Solar System Scope); si es null (como en Plutón, sin textura pública
// conocida), CuerpoCeleste usará directamente "color", igual que antes.
const DESTINOS_ESPACIALES = {
  'La Luna': { color: '#9ca3af', tamano: 1.6, anillos: false, textura: '/textures/2k_moon.jpg' },
  'Marte': { color: '#dc2626', tamano: 1.7, anillos: false, textura: '/textures/2k_mars.jpg' },
  'Júpiter': { color: '#f59e0b', tamano: 2.6, anillos: false, textura: '/textures/2k_jupiter.jpg' },
  'Saturno': { color: '#facc15', tamano: 2.3, anillos: true, textura: '/textures/2k_saturn.jpg' },
  'Urano': { color: '#22d3ee', tamano: 2.0, anillos: false, textura: '/textures/2k_uranus.jpg' },
  'Neptuno': { color: '#1d4ed8', tamano: 2.0, anillos: false, textura: '/textures/2k_neptune.jpg' },
  'Plutón': { color: '#6b7280', tamano: 1.3, anillos: false, textura: '/textures/2k_moon.jpg' },
}

// TEXTURAS_PASOS
// Por qué existe: cada planeta de un step usa una textura distinta según su
// orden (rotando si hay más de 7 steps), igual que con PALETA_PASOS. Son
// imágenes públicas de Solar System Scope (https://www.solarsystemscope.com/textures/).
const TEXTURAS_PASOS = [
  '/textures/2k_mercury.jpg',
  '/textures/2k_venus_surface.jpg',
  '/textures/2k_mars.jpg',
  '/textures/2k_jupiter.jpg',
  '/textures/2k_saturn.jpg',
  '/textures/2k_uranus.jpg',
  '/textures/2k_neptune.jpg',
]

// URL_TEXTURA_SOL / URL_TEXTURA_TIERRA
// Texturas de los dos cuerpos que no forman parte de ningún array porque son
// únicos en la escena: el Sol y la Tierra (punto de partida).
const URL_TEXTURA_SOL = '/textures/2k_sun.jpg'
const URL_TEXTURA_TIERRA = '/textures/2k_earth_daymap.jpg'

// Distancias y velocidades base de las órbitas (unidades arbitrarias de la escena).
const RADIO_SOL = 3
const RADIO_TIERRA = 5
const TAMANO_TIERRA = 1.2
const RADIO_PRIMER_PASO = 9
const SEPARACION_PASOS = 3.5
const SEPARACION_DESTINO = 4.5
const TAMANO_PASO = 1
const VELOCIDAD_ORBITAL_BASE = 1.4
const DURACION_MATERIALIZACION = 1.2 // segundos que tarda un cuerpo en aparecer

// generarPuntosOrbita
// Qué hace: genera los puntos de un círculo en el plano XZ.
// Por qué existe: estos puntos se usan para dibujar la línea de órbita de
// cada planeta alrededor del Sol.
// Recibe: radio del círculo y número de segmentos (resolución).
// Devuelve: un array de puntos [x, 0, z].
function generarPuntosOrbita(radio, segmentos = 80) {
  const puntos = []
  for (let i = 0; i <= segmentos; i++) {
    const angulo = (i / segmentos) * Math.PI * 2
    puntos.push([Math.cos(angulo) * radio, 0, Math.sin(angulo) * radio])
  }
  return puntos
}

// LineaOrbita
// Qué hace: dibuja un círculo punteado y tenue en el plano XZ que marca la
// trayectoria orbital de un planeta.
// Recibe: radio (radio de la órbita a dibujar).
// Devuelve: una línea punteada de Three.js.
function LineaOrbita({ radio }) {
  const puntos = useMemo(() => generarPuntosOrbita(radio), [radio])

  return (
    <Line
      points={puntos}
      color="#3b4a6b"
      lineWidth={1}
      dashed
      dashScale={3}
      transparent
      opacity={0.4}
    />
  )
}

// ---------------------------------------------------------------------
// Texturas: carga con fallback a color (Fase texturas)
// ---------------------------------------------------------------------

// MaterialConTextura
// Qué hace: carga la imagen de "url" con useTexture (de @react-three/drei) y
// la aplica a un meshStandardMaterial mediante la prop "map" (en lugar de
// "color"). Mientras se descarga, el componente "suspende" su renderizado;
// si la descarga falla (red, CORS, URL caída...), useTexture lanza un error.
// Por qué existe: aísla la llamada a useTexture para que el Suspense y el
// ErrorBoundary de MaterialCuerpoCeleste puedan mostrar el material de color
// mientras carga o si falla, sin tocar la lógica de órbitas/animación.
// Recibe: url (de la textura), materialRef (para que CuerpoCeleste pueda
// seguir animando emissiveIntensity), emissive y emissiveIntensity.
// Devuelve: un meshStandardMaterial con la textura aplicada.
function MaterialConTextura({ url, materialRef, emissive, emissiveIntensity }) {
  const textura = useTexture(url)

  return (
    <meshStandardMaterial
      ref={materialRef}
      map={textura}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  )
}

// TexturaErrorBoundary
// Qué hace: si MaterialConTextura lanza un error (la textura no carga),
// captura ese error y renderiza "fallback" (el material de color sólido) en
// su lugar, sin romper el resto de la escena 3D.
// Por qué existe: useTexture no se puede envolver en un try/catch normal
// porque "suspende" el render; un ErrorBoundary es el equivalente de React
// para capturar ese tipo de fallos durante el renderizado.
// Recibe: fallback (el material a mostrar si falla) y children.
// Devuelve: children, o fallback si ha ocurrido un error.
class TexturaErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: false }
  }

  static getDerivedStateFromError() {
    return { error: true }
  }

  render() {
    return this.state.error ? this.props.fallback : this.props.children
  }
}

// MaterialCuerpoCeleste
// Qué hace: decide el material de la esfera de un cuerpo celeste (o del
// Sol). Si "texturaUrl" es null, usa directamente el material de color de
// siempre. Si hay "texturaUrl", intenta cargarla con MaterialConTextura: el
// material de color se muestra como fallback mientras carga (Suspense) o si
// la carga falla (TexturaErrorBoundary).
// Por qué existe: centraliza el "textura con fallback a color" para que
// CuerpoCeleste y Sol lo reutilicen sin duplicar la lógica de Suspense/ErrorBoundary.
// Recibe: texturaUrl (URL o null), color, emissive (por defecto, igual a
// color), emissiveIntensity (por defecto 0.3) y materialRef (opcional).
// Devuelve: un meshStandardMaterial, con o sin textura.
function MaterialCuerpoCeleste({ texturaUrl, color, emissive = color, emissiveIntensity = 0.3, materialRef = null }) {
  const materialColor = (
    <meshStandardMaterial ref={materialRef} color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
  )

  if (!texturaUrl) {
    return materialColor
  }

  return (
    <TexturaErrorBoundary fallback={materialColor}>
      <Suspense fallback={materialColor}>
        <MaterialConTextura
          url={texturaUrl}
          materialRef={materialRef}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </Suspense>
    </TexturaErrorBoundary>
  )
}

// CuerpoCeleste
// Qué hace: representa cualquier cuerpo celeste (Tierra, planeta de un step
// o planeta destino) como una esfera que orbita alrededor del Sol. Al
// montarse, anima su escala de 0 a tamaño normal (materialización) con un
// brillo extra que se va apagando, y si recibe "onClick" se puede pulsar.
// Recibe: radioOrbita, velocidadAngular, anguloInicial, tamano, color,
// anillos (boolean), etiqueta (texto bajo el cuerpo, opcional), numeroOrden
// (número flotando encima, opcional), onClick y texturaUrl (URL de la
// textura del planeta, opcional; si falla o no se indica, se usa "color").
// Devuelve: un grupo de Three.js con la esfera, sus anillos (si tiene) y
// sus etiquetas de texto.
function CuerpoCeleste({
  radioOrbita = 0,
  velocidadAngular = 0,
  anguloInicial = 0,
  tamano = 1,
  color = '#ffffff',
  anillos = false,
  etiqueta = null,
  numeroOrden = null,
  onClick = null,
  texturaUrl = null,
}) {
  const grupoRef = useRef()
  const materialRef = useRef()
  const anguloRef = useRef(anguloInicial)
  const tiempoInicioRef = useRef(null)

  useFrame((state, delta) => {
    anguloRef.current += delta * velocidadAngular

    const tiempoActual = state.clock.elapsedTime
    if (tiempoInicioRef.current === null) {
      tiempoInicioRef.current = tiempoActual
    }

    // progreso de materialización: 0 (recién aparecido) -> 1 (tamaño normal).
    const progreso = Math.min((tiempoActual - tiempoInicioRef.current) / DURACION_MATERIALIZACION, 1)
    const escala = progreso < 1 ? progreso * (2 - progreso) : 1

    if (grupoRef.current) {
      grupoRef.current.position.set(
        Math.cos(anguloRef.current) * radioOrbita,
        0,
        Math.sin(anguloRef.current) * radioOrbita,
      )
      grupoRef.current.scale.setScalar(escala)
    }

    if (materialRef.current) {
      // Brillo extra mientras se está materializando, que se apaga al llegar a 1.
      materialRef.current.emissiveIntensity = 0.3 + (1 - progreso) * 1.5
    }
  })

  return (
    <group ref={grupoRef}>
      <mesh
        onClick={onClick ? (event) => { event.stopPropagation(); onClick() } : undefined}
        onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer' } : undefined}
        onPointerOut={onClick ? () => { document.body.style.cursor = 'default' } : undefined}
      >
        <sphereGeometry args={[tamano, 32, 32]} />
        {/* Si "texturaUrl" existe, se usa map={textura} (con fallback a
            "color" mientras carga o si falla); si no, se usa "color" como antes. */}
        <MaterialCuerpoCeleste texturaUrl={texturaUrl} color={color} materialRef={materialRef} />
      </mesh>

      {anillos && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[tamano * 1.4, tamano * 2.1, 64]} />
          <meshBasicMaterial color="#d4af37" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}

      <Billboard position={[0, tamano + 1.2, 0]}>
        {numeroOrden != null && (
          <Text fontSize={0.7} color="#ffffff" anchorX="center" anchorY="middle">
            {numeroOrden}
          </Text>
        )}
        {etiqueta && (
          <Text
            fontSize={0.6}
            color="#7dd3fc"
            anchorX="center"
            anchorY="middle"
            position={[0, numeroOrden != null ? -0.9 : 0, 0]}
          >
            {etiqueta}
          </Text>
        )}
      </Billboard>
    </group>
  )
}

// Sol
// Qué hace: dibuja la esfera central del sistema (el Sol), con un material
// emisivo naranja/amarillo y una luz puntual que ilumina el resto de la escena.
// Recibe: nada.
// Devuelve: un grupo con la esfera del Sol y su luz puntual.
function Sol() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[RADIO_SOL, 32, 32]} />
        {/* Textura del Sol (URL_TEXTURA_SOL), con el mismo color/emissive de
            siempre como fallback mientras carga o si la textura falla. */}
        <MaterialCuerpoCeleste
          texturaUrl={URL_TEXTURA_SOL}
          color="#fbbf24"
          emissive="#f97316"
          emissiveIntensity={1.2}
        />
      </mesh>
      <pointLight color="#fff3d6" intensity={3} distance={200} decay={0.4} />
    </group>
  )
}

// Cohete
// Qué hace: dibuja un pequeño cono que representa el cohete del usuario,
// situado entre la órbita de la Tierra y la órbita del destino, a una
// distancia proporcional al progreso de la ruta, con una ligera flotación
// para dar sensación de movimiento.
// Por qué existe: representa visualmente el "viaje" hacia el destino una
// vez que la ruta está completada.
// Recibe: progreso (0-1) y radioDestino (radio de la órbita del destino).
// Devuelve: un cono orientado hacia el destino.
function Cohete({ progreso, radioDestino }) {
  const grupoRef = useRef()

  useFrame((state) => {
    if (!grupoRef.current) return

    const distancia = RADIO_TIERRA + (radioDestino - RADIO_TIERRA) * progreso
    const flotacion = Math.sin(state.clock.elapsedTime * 2) * 0.3

    grupoRef.current.position.set(distancia, flotacion, 0)
  })

  return (
    <group ref={grupoRef} rotation={[0, 0, -Math.PI / 2]}>
      <mesh>
        <coneGeometry args={[0.4, 1.4, 12]} />
        <meshStandardMaterial color="#e5e7eb" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// StepInfoPanel
// Qué hace: panel lateral en HTML/CSS normal (fuera del Canvas de Three.js)
// que muestra el detalle de un step: su número de orden, título,
// descripción, proyecto de aprendizaje y duración estimada, con un botón
// para cerrarlo.
// Recibe: step (el step seleccionado) y onClose (función para cerrar el panel).
// Devuelve: el panel de información.
function StepInfoPanel({ step, onClose }) {
  return (
    <aside className="info-panel">
      <button className="info-panel__cerrar" onClick={onClose} aria-label="Cerrar panel">
        ✕
      </button>
      <p className="info-panel__numero">Paso {step.orden}</p>
      <h4>{step.titulo}</h4>
      <p>{step.descripcion}</p>
      <p><strong>Proyecto de aprendizaje:</strong> {step.proyecto_aprendizaje}</p>
      <p><strong>Duración estimada:</strong> {step.tiempo_estimado_semanas} semanas</p>
    </aside>
  )
}

// SolarSystemFallback
// Qué hace: representación simple en CSS de la ruta (sol, tierra, steps y
// destino como círculos en fila), usada cuando la escena 3D no se puede
// renderizar (por ejemplo, sin soporte de WebGL).
// Recibe: route.
// Devuelve: una fila de círculos con las etiquetas de cada cuerpo.
function SolarSystemFallback({ route }) {
  const steps = route?.steps || []
  const destino = DESTINOS_ESPACIALES[route?.destino_espacial] || DESTINOS_ESPACIALES['La Luna']

  return (
    <div className="solar-system-fallback">
      <div className="cuerpo cuerpo--sol" title="Sol">Sol</div>
      <div className="cuerpo cuerpo--tierra" title="Inicio (Tierra)">Inicio</div>
      {steps.map((step, indice) => (
        <div
          key={step.id}
          className="cuerpo"
          style={{ background: PALETA_PASOS[indice % PALETA_PASOS.length] }}
          title={step.titulo}
        >
          {step.orden}
        </div>
      ))}
      <div className="cuerpo cuerpo--destino" style={{ background: destino.color }} title={route?.destino_espacial}>
        {route?.destino_espacial}
      </div>
    </div>
  )
}

// EscenaErrorBoundary
// Qué hace: captura errores al renderizar la escena 3D (por ejemplo, si el
// navegador no soporta WebGL) y muestra el fallback en CSS en su lugar,
// para que el Dashboard no se rompa por completo.
// Recibe: route (se reenvía al fallback) y children (la escena 3D a proteger).
// Devuelve: los children, o SolarSystemFallback si ha ocurrido un error.
class EscenaErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: false }
  }

  static getDerivedStateFromError() {
    return { error: true }
  }

  render() {
    if (this.state.error) {
      return <SolarSystemFallback route={this.props.route} />
    }

    return this.props.children
  }
}

// SolarSystem
// Qué hace: renderiza una escena 3D del sistema solar para visualizar una
// ruta de aprendizaje generada por la IA: el Sol en el centro, la Tierra
// (punto de partida) cerca de él, un planeta por cada step de la ruta y,
// más lejos, el planeta correspondiente al destino espacial. Mientras la
// ruta está en estado "generando" solo se muestran las estrellas y el Sol.
// Si la ruta está "completada", añade un cohete viajando hacia el destino.
// Al hacer click en el planeta de un step se muestra un panel lateral con
// su información.
// Por qué existe: es la visualización principal del Dashboard para una
// ruta generada.
// Recibe: route (la ruta con sus steps; route.steps puede ser undefined) y
// onStepSelect (opcional; se llama con el step pulsado para que el
// Dashboard muestre su tablero de progreso tipo Trello).
// Devuelve: un contenedor con el Canvas de Three.js y, si hay un step
// seleccionado, el panel de información en HTML normal (fuera del Canvas).
function SolarSystem({ route, onStepSelect }) {
  const [stepSeleccionado, setStepSeleccionado] = useState(null)

  if (!route) {
    return null
  }

  const steps = route.steps || []
  const enGeneracion = route.estado === 'generando'
  const destino = DESTINOS_ESPACIALES[route.destino_espacial] || DESTINOS_ESPACIALES['La Luna']
  const radioDestino = RADIO_PRIMER_PASO + steps.length * SEPARACION_PASOS + SEPARACION_DESTINO

  return (
    <div className="solar-system">
      <EscenaErrorBoundary route={route}>
        <Canvas camera={{ position: [0, 22, 40], fov: 50 }}>
          <color attach="background" args={['#02040a']} />
          <ambientLight intensity={0.25} />
          <Stars radius={120} depth={60} count={3000} factor={3} saturation={0} fade speed={0.5} />

          <Sol />

          {!enGeneracion && (
            <>
              <LineaOrbita radio={RADIO_TIERRA} />
              <CuerpoCeleste
                radioOrbita={RADIO_TIERRA}
                velocidadAngular={VELOCIDAD_ORBITAL_BASE / RADIO_TIERRA}
                anguloInicial={0}
                tamano={TAMANO_TIERRA}
                color="#14b8a6"
                etiqueta="Inicio"
                texturaUrl={URL_TEXTURA_TIERRA}
              />

              {steps.map((step, indice) => {
                const radioOrbita = RADIO_PRIMER_PASO + indice * SEPARACION_PASOS

                return (
                  <group key={step.id}>
                    <LineaOrbita radio={radioOrbita} />
                    <CuerpoCeleste
                      radioOrbita={radioOrbita}
                      velocidadAngular={VELOCIDAD_ORBITAL_BASE / radioOrbita}
                      anguloInicial={(indice * Math.PI) / 3}
                      tamano={TAMANO_PASO}
                      color={PALETA_PASOS[indice % PALETA_PASOS.length]}
                      numeroOrden={step.orden}
                      onClick={() => {
                        setStepSeleccionado(step)
                        // Avisamos al Dashboard del step pulsado para que muestre su tablero Trello.
                        onStepSelect?.(step)
                      }}
                      texturaUrl={TEXTURAS_PASOS[indice % TEXTURAS_PASOS.length]}
                    />
                  </group>
                )
              })}

              <LineaOrbita radio={radioDestino} />
              <CuerpoCeleste
                radioOrbita={radioDestino}
                velocidadAngular={VELOCIDAD_ORBITAL_BASE / radioDestino}
                anguloInicial={Math.PI}
                tamano={destino.tamano}
                color={destino.color}
                anillos={destino.anillos}
                etiqueta={route.destino_espacial}
                texturaUrl={destino.textura}
              />

              {route.estado === 'completada' && steps.length > 0 && (
                // La ruta completada se representa con el cohete ya en su
                // destino (progreso = 1).
                <Cohete progreso={1} radioDestino={radioDestino} />
              )}
            </>
          )}

          <OrbitControls enablePan={false} minDistance={15} maxDistance={90} />
        </Canvas>
      </EscenaErrorBoundary>

      {stepSeleccionado && (
        <StepInfoPanel step={stepSeleccionado} onClose={() => setStepSeleccionado(null)} />
      )}
    </div>
  )
}

export default SolarSystem
