import { useMemo } from 'react'

// Cuántas estrellas se generan para el fondo animado.
const NUM_ESTRELLAS = 200

// generarEstrellas
// Qué hace: genera 200 estrellas con posición (top/left en %), tamaño y
// temporización de parpadeo aleatorias. El tamaño sigue una distribución
// 70% / 25% / 5% (1px / 2px / 3px), para que la mayoría de estrellas sean
// pequeñas y solo unas pocas destaquen más. El delay (0-5s) y la duración
// (2-6s) son aleatorios para que el parpadeo de cada estrella sea
// independiente del resto.
// Devuelve: un array de NUM_ESTRELLAS objetos { top, left, size, delay,
// duration }.
const generarEstrellas = () => Array.from({ length: NUM_ESTRELLAS }, () => {
  const tamanoAleatorio = Math.random()
  const size = tamanoAleatorio < 0.7 ? 1 : tamanoAleatorio < 0.95 ? 2 : 3

  return {
    top: Math.random() * 100,
    left: Math.random() * 100,
    size,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 4,
  }
})

// StarField
// Qué hace: fondo fijo de pantalla completa con 200 estrellas que titilan
// (animación "twinkle" definida en index.css), cada una con su propio
// tamaño, posición, delay y duración. Sustituye al fondo de estrellas
// estático anterior (".stars" con capas de box-shadow).
// Por qué existe: dar sensación de "espacio vivo" detrás del contenido y
// del canvas de Three.js en todas las páginas de la app.
// Recibe: nada.
// Devuelve: un contenedor fijo (z-index: -1, pointer-events: none) con las
// 200 estrellas.
function StarField() {
  // useMemo evita regenerar las posiciones aleatorias en cada renderizado.
  const estrellas = useMemo(() => generarEstrellas(), [])

  return (
    <div className="star-field" aria-hidden="true">
      {estrellas.map((estrella, indice) => (
        <div
          key={indice}
          className="star-field__star"
          style={{
            top: `${estrella.top}%`,
            left: `${estrella.left}%`,
            width: `${estrella.size}px`,
            height: `${estrella.size}px`,
            animationDelay: `${estrella.delay}s`,
            animationDuration: `${estrella.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export default StarField
