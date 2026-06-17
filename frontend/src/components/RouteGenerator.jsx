import { useState } from 'react'
import api from '../api/axios'

// RouteGenerator
// Qué hace: formulario con dos campos ("destino" y "punto de partida") y un
// botón para generar una nueva ruta de aprendizaje con IA. Mientras la IA
// está generando la ruta (puede tardar varios segundos) muestra un estado
// de carga, y si el usuario ha alcanzado el límite de rutas de su plan (u
// otro error) muestra el mensaje correspondiente.
// Por qué existe: es el punto de entrada del "generador de rutas con IA"
// en el Dashboard.
// Recibe: onRutaGenerada (función a llamar, sin argumentos, cuando se ha
// generado una ruta correctamente, para que el Dashboard recargue la lista).
// Devuelve: el formulario de generación de rutas.
function RouteGenerator({ onRutaGenerada }) {
  const [destino, setDestino] = useState('')
  const [puntoPartida, setPuntoPartida] = useState('')
  // Fecha de hoy en formato YYYY-MM-DD, usada como valor por defecto del picker.
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0])
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  // handleSubmit
  // Qué hace: evita el envío normal del formulario y llama a
  // POST /routes/generate con el destino y el punto de partida indicados.
  // Si la petición tiene éxito, limpia el formulario y avisa al Dashboard
  // mediante onRutaGenerada para que recargue la lista de rutas. Si falla
  // (por ejemplo, por haber alcanzado el límite del plan free), muestra el
  // mensaje de error devuelto por el backend.
  // Recibe: event (el evento "submit" del formulario).
  // Devuelve: nada (sus efectos son el aviso al Dashboard o el mensaje de error).
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setGenerando(true)

    try {
      await api.post('/routes/generate', {
        destino,
        punto_partida: puntoPartida,
        fecha_inicio: fechaInicio,
      })

      setDestino('')
      setPuntoPartida('')
      setFechaInicio(new Date().toISOString().split('T')[0])

      if (onRutaGenerada) {
        onRutaGenerada()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido generar la ruta.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Generar nueva ruta</h3>

      {error && <p role="alert" className="form-error">{error}</p>}

      <div className="field">
        <label className="field__label" htmlFor="route-destino">¿A dónde quieres llegar?</label>
        <textarea
          className="field__input"
          id="route-destino"
          value={destino}
          onChange={(event) => setDestino(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="route-punto-partida">¿De dónde partes?</label>
        <textarea
          className="field__input"
          id="route-punto-partida"
          value={puntoPartida}
          onChange={(event) => setPuntoPartida(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="route-fecha-inicio">¿Cuándo quieres empezar?</label>
        <input
          className="field__input"
          type="date"
          id="route-fecha-inicio"
          value={fechaInicio}
          min={new Date().toISOString().split('T')[0]}
          onChange={(event) => setFechaInicio(event.target.value)}
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={generando}>
        {generando ? 'Generando ruta... esto puede tardar unos segundos' : 'Generar ruta'}
      </button>
    </form>
  )
}

export default RouteGenerator
