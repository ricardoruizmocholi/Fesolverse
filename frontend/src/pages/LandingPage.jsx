import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SolarSystem from '../components/SolarSystem'

// RUTA_DEMO_HERO
// Qué hace: ruta "vacía" usada únicamente para que SolarSystem dibuje el
// fondo del Hero (estrellas, Sol, Tierra, unos planetas sin etiquetas y un
// destino con anillos) sin depender de ninguna ruta real generada por la IA.
// SolarSystem no renderiza nada si "route" es null, así que necesita un
// objeto mínimo. Los steps no llevan "orden" para que no aparezcan números
// flotando sobre los planetas: son puramente decorativos.
const RUTA_DEMO_HERO = {
  estado: 'completada',
  destino_espacial: 'Saturno',
  steps: [{ id: 'hero-1' }, { id: 'hero-2' }, { id: 'hero-3' }],
}

// RUTA_DEMO_PREVIEW
// Qué hace: ruta de ejemplo (con 4 steps) usada en la sección "Visualización
// espacial" para mostrar, en miniatura, cómo se vería una ruta real de un
// usuario: la Tierra como inicio, 4 planetas numerados como steps y Marte
// como destino, con el cohete ya llegado (ruta "completada").
const RUTA_DEMO_PREVIEW = {
  estado: 'completada',
  destino_espacial: 'Marte',
  steps: [
    { id: 'preview-1', orden: 1, titulo: 'Fundamentos', tiempo_estimado_semanas: 2 },
    { id: 'preview-2', orden: 2, titulo: 'Práctica guiada', tiempo_estimado_semanas: 3 },
    { id: 'preview-3', orden: 3, titulo: 'Proyecto real', tiempo_estimado_semanas: 4 },
    { id: 'preview-4', orden: 4, titulo: 'Especialización', tiempo_estimado_semanas: 3 },
  ],
}

// DESTINOS_UNIVERSO
// Por qué existe: datos de la sección "¿Hasta dónde quieres llegar?". Cada
// destino define su título (con el emoji tal y como lo pide el diseño, como
// detalle secundario dentro del texto), su descripción y el color que se usa
// para el borde y el glow al pasar el ratón sobre la card.
const DESTINOS_UNIVERSO = [
  { titulo: '🌙 La Luna', descripcion: 'Objetivos alcanzables en semanas', color: '#cbd5e1' },
  { titulo: '🔴 Marte', descripcion: 'Metas que requieren meses de trabajo', color: '#ef4444' },
  { titulo: '🟠 Júpiter', descripcion: 'Retos ambiciosos de largo plazo', color: '#f97316' },
  { titulo: '⚫ Plutón', descripcion: 'Los sueños más difíciles del universo', color: '#a78bfa' },
]

// IconoMeta / IconoIA / IconoCohete
// Por qué existen: la sección "Cómo funciona" pide iconos grandes que no
// sean emoji. Son SVG inline muy simples (trazo en "currentColor", así
// heredan el color naranja de ".landing-card__icon") para no añadir
// dependencias de librerías de iconos.
function IconoMeta() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <circle cx="24" cy="24" r="12" />
      <circle cx="24" cy="24" r="4" fill="currentColor" />
    </svg>
  )
}

function IconoIA() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="24" cy="9" r="4" />
      <circle cx="9" cy="36" r="4" />
      <circle cx="39" cy="36" r="4" />
      <line x1="24" y1="13" x2="11" y2="32" />
      <line x1="24" y1="13" x2="37" y2="32" />
      <line x1="13" y1="36" x2="35" y2="36" />
    </svg>
  )
}

function IconoCohete() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M24 4c6.5 6 9 14.5 9 23 0 4.5-2.3 8.5-9 12.5-6.7-4-9-8-9-12.5 0-8.5 2.5-17 9-23z" />
      <circle cx="24" cy="19" r="3" fill="currentColor" />
      <path d="M15 31l-5.5 8.5M33 31l5.5 8.5" />
    </svg>
  )
}

// LandingPage
// Qué hace: página de inicio pública de Fesolverse (ruta "/" cuando no hay
// sesión iniciada). Presenta el producto en 5 secciones (hero con el sistema
// solar de fondo, cómo funciona, visualización espacial, destinos del
// universo y llamada a la acción final) más un footer con los enlaces de
// autenticación.
// Por qué existe: sustituye al antiguo Home (lista de proyectos) como
// landing comercial de la app, y es el punto de entrada para que un
// visitante anónimo decida registrarse.
// Recibe: nada.
// Devuelve: el conjunto de secciones de la landing.
function LandingPage() {
  // Scroll reveal simple: las secciones marcadas con "landing-reveal"
  // empiezan invisibles y desplazadas; en cuanto entran en el viewport se
  // les añade "landing-reveal--visible", que activa la transición CSS de
  // opacidad y posición. Una vez visibles se dejan de observar.
  useEffect(() => {
    const elementos = document.querySelectorAll('.landing-reveal')

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('landing-reveal--visible')
          observador.unobserve(entrada.target)
        }
      })
    }, { threshold: 0.15 })

    elementos.forEach((elemento) => observador.observe(elemento))

    return () => observador.disconnect()
  }, [])

  return (
    <div className="landing">
      {/* SECCIÓN 1: HERO. El sistema solar ocupa todo el fondo (100vh) con
          pointer-events: none para no robar el scroll ni los clicks; el
          contenido (badge, título, subtítulo, botones) va encima con
          z-index superior. */}
      <section className="landing-hero">
        <div
          className="landing-hero__canvas"
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
        >
          <SolarSystem route={RUTA_DEMO_HERO} />
        </div>

        <div className="landing-hero__content" style={{ position: 'relative', zIndex: 1 }}>
          <span className="landing-badge">✦ Impulsado por IA</span>

          <h1 className="landing-hero__title">
            Traza tu ruta
            <br />
            hacia cualquier meta.
          </h1>

          <p className="landing-hero__subtitle">
            Fesolverse convierte tus objetivos en rutas de aprendizaje personalizadas,
            visualizadas como un viaje por el universo.
          </p>

          <div className="landing-hero__actions">
            <Link to="/register" className="btn-primary landing-btn-lg">Empieza gratis →</Link>
            <a href="#como-funciona" className="btn-secondary landing-btn-lg">Ver cómo funciona</a>
          </div>
        </div>

        <a href="#como-funciona" className="landing-hero__scroll">Descubre más ↓</a>
      </section>

      {/* SECCIÓN 2: CÓMO FUNCIONA */}
      <section id="como-funciona" className="landing-steps">
        <h2 className="landing-section-title landing-reveal">Tres pasos hacia tu destino</h2>

        <div className="landing-steps__grid">
          <div className="landing-card landing-reveal">
            <div className="landing-card__icon"><IconoMeta /></div>
            <h3>Define tu meta</h3>
            <p>Dinos a dónde quieres llegar y de dónde partes. Puede ser una oferta de trabajo, una habilidad o un sueño.</p>
          </div>

          <div className="landing-card landing-reveal">
            <div className="landing-card__icon"><IconoIA /></div>
            <h3>La IA traza tu ruta</h3>
            <p>Gemini analiza tu punto de partida y genera una ruta única con pasos concretos, proyectos y tiempos estimados.</p>
          </div>

          <div className="landing-card landing-reveal">
            <div className="landing-card__icon"><IconoCohete /></div>
            <h3>Explora y avanza</h3>
            <p>Visualiza tu viaje como un sistema solar o un mapa de carretera. Completa tareas y ve avanzando hacia tu destino.</p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: VISUALIZACIÓN ESPACIAL */}
      <section className="landing-visual">
        <div className="landing-visual__text landing-reveal">
          <p className="landing-eyebrow">Visualización única</p>
          <h2>Tu progreso, visto desde el espacio.</h2>
          <p>
            Cada objetivo se convierte en un viaje por el sistema solar. Cada paso es un
            planeta. Cada tarea completada te acerca más a tu destino.
          </p>

          <ul className="landing-feature-list">
            <li>Sistema solar 3D interactivo</li>
            <li>Vista de mapa de carretera real</li>
            <li>Transición entre vistas con un click</li>
          </ul>

          <Link to="/register" className="btn-primary landing-btn-lg">Crear mi primera ruta →</Link>
        </div>

        {/* Mini preview: el mismo SolarSystem, en pequeño, con una ruta de
            ejemplo de 4 planetas para mostrar el resultado real. */}
        <div className="landing-visual__demo landing-reveal">
          <SolarSystem route={RUTA_DEMO_PREVIEW} />
        </div>
      </section>

      {/* SECCIÓN 4: DESTINOS */}
      <section className="landing-destinations">
        <h2 className="landing-section-title landing-reveal">¿Hasta dónde quieres llegar?</h2>
        <p className="landing-destinations__subtitle landing-reveal">
          La dificultad de tu objetivo determina tu destino en el universo.
        </p>

        <div className="landing-destinations__grid">
          {DESTINOS_UNIVERSO.map((destino) => (
            <div
              key={destino.titulo}
              className="landing-destination-card landing-reveal"
              style={{ '--planet-color': destino.color }}
            >
              <h3>{destino.titulo}</h3>
              <p>{destino.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 5: CTA FINAL */}
      <section className="landing-cta landing-reveal">
        <h2>¿Listo para despegar?</h2>
        <p>Únete gratis. Las primeras 2 rutas son gratuitas.</p>
        <Link to="/register" className="btn-primary landing-btn-lg">Crear mi cuenta gratis</Link>
        <p className="landing-cta__note">Sin tarjeta de crédito. Sin compromisos.</p>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p className="landing-footer__logo">Fesolverse <span className="navbar__dot">✦</span></p>

        <nav className="landing-footer__links">
          <Link to="/">Inicio</Link>
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/register">Registrarse</Link>
          <Link to="/admin">Admin</Link>
        </nav>

        <p className="landing-footer__copy">© 2026 Fesolverse. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

export default LandingPage
