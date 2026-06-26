import { useRef, useState, useEffect } from 'react'
import api from '../api/axios'

const LIMITE_FREE = 5

function ChatbotPanel({ task, route, user, onClose, onMensajesUsadosChange }) {
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const listaRef = useRef(null)

  const esFree = user?.plan === 'free'
  const mensajesUsados = route?.chatbot_mensajes_usados ?? 0
  const limiteAlcanzado = esFree && mensajesUsados >= LIMITE_FREE

  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight
    }
  }, [mensajes])

  const enviarMensaje = async () => {
    const texto = input.trim()
    if (!texto || enviando) return

    setInput('')
    setError('')
    setMensajes((prev) => [...prev, { rol: 'usuario', texto }])
    setEnviando(true)

    try {
      const response = await api.post(`/tasks/${task.id}/chat`, { mensaje: texto })
      const { respuesta, chatbot_mensajes_usados } = response.data.data

      setMensajes((prev) => [...prev, { rol: 'asistente', texto: respuesta }])
      onMensajesUsadosChange?.(chatbot_mensajes_usados)
    } catch (err) {
      const mensaje = err.response?.data?.message || 'No se ha podido enviar el mensaje.'
      setError(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      enviarMensaje()
    }
  }

  return (
    <div className="chatbot-panel">
      <div className="chatbot-panel__cabecera">
        <h4>Asistente — {task.titulo}</h4>
        <button className="chatbot-panel__cerrar" onClick={onClose} aria-label="Cerrar asistente">
          ✕
        </button>
      </div>

      {esFree && (
        <div className="chatbot-panel__contador">
          {mensajesUsados} de {LIMITE_FREE} mensajes usados en esta ruta
        </div>
      )}

      <div className="chatbot-panel__mensajes" ref={listaRef}>
        {mensajes.length === 0 && (
          <p className="chatbot-panel__vacio">
            Pregunta lo que necesites sobre esta tarea. El asistente conoce el contexto de tu ruta y tu paso actual.
          </p>
        )}

        {mensajes.map((msg, i) => (
          <div key={i} className={`chatbot-panel__mensaje chatbot-panel__mensaje--${msg.rol}`}>
            <span className="chatbot-panel__autor">
              {msg.rol === 'usuario' ? 'Tu' : 'Asistente'}
            </span>
            <p>{msg.texto}</p>
          </div>
        ))}

        {enviando && (
          <div className="chatbot-panel__mensaje chatbot-panel__mensaje--asistente">
            <span className="chatbot-panel__autor">Asistente</span>
            <p className="chatbot-panel__escribiendo">El asistente esta escribiendo...</p>
          </div>
        )}
      </div>

      {error && <p className="chatbot-panel__error">{error}</p>}

      {limiteAlcanzado ? (
        <div className="chatbot-panel__limite">
          <p>Has alcanzado el limite de mensajes gratuitos para esta ruta.</p>
          <a href="/perfil" className="btn-primary">Actualizar a Pro</a>
        </div>
      ) : (
        <div className="chatbot-panel__input">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            disabled={enviando}
            rows={2}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={enviarMensaje}
            disabled={enviando || !input.trim()}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  )
}

export default ChatbotPanel
