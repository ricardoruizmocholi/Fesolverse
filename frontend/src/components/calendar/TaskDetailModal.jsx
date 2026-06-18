import { useState } from 'react'

// fechaAFormatoIcs
// Convierte "2026-06-20" o "2026-06-20T00:00:00Z" a "20260620".
function fechaAFormatoIcs(fechaStr) {
  return String(fechaStr).slice(0, 10).replace(/-/g, '')
}

// fechaSiguienteIcs
// Devuelve el día siguiente en formato YYYYMMDD. Usa Date.UTC para evitar
// desplazamientos por zona horaria local.
function fechaSiguienteIcs(fechaStr) {
  const [y, m, d] = String(fechaStr).slice(0, 10).split('-').map(Number)
  const siguiente = new Date(Date.UTC(y, m - 1, d + 1))
  return [
    siguiente.getUTCFullYear(),
    String(siguiente.getUTCMonth() + 1).padStart(2, '0'),
    String(siguiente.getUTCDate()).padStart(2, '0'),
  ].join('')
}

// generarUrlGoogleCalendar
// Genera una URL para crear un evento de un día completo en Google Calendar.
// No usa API keys ni OAuth: abre el formulario prellenado en una pestaña nueva.
function generarUrlGoogleCalendar(task) {
  const inicio = fechaAFormatoIcs(task.fecha_limite)
  const fin = fechaSiguienteIcs(task.fecha_limite)

  const detalles = [
    task.descripcion || '',
    task.route ? `Ruta: ${task.route.titulo}` : '',
    task.step ? `Paso: ${task.step.titulo}` : '',
  ].filter(Boolean).join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.titulo,
    dates: `${inicio}/${fin}`,
    details: detalles,
    location: 'Fesolverse',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ETIQUETA_ESTADO
// Mapea el valor del campo "estado" a la etiqueta legible y al modificador
// CSS del badge de color.
const ETIQUETA_ESTADO = {
  pendiente:   { label: 'Pendiente',   mod: 'gris'  },
  en_progreso: { label: 'En progreso', mod: 'cyan'  },
  completada:  { label: 'Completada',  mod: 'verde' },
}

// TaskDetailModal
// Qué hace: modal glassmorphism con el detalle completo de una task del
// calendario. Muestra el título, descripción, ruta de origen (route.titulo),
// paso de origen (step.titulo), estado, notas y una fecha_limite editable.
// El botón "Guardar fecha" llama a onFechaChange con la nueva fecha, y el
// botón "✕" o el clic sobre el backdrop cierra el modal.
// Recibe:
//   task          — objeto task con step y route.
//   onClose       — callback para cerrar el modal sin guardar.
//   onFechaChange — callback(taskId, fechaString|null) para persistir la fecha.
// Devuelve: el overlay y la tarjeta modal.
function TaskDetailModal({ task, onClose, onFechaChange }) {
  // Inicializar el campo de fecha con el valor actual de la task, o vacío
  // si no tiene fecha asignada.
  const [fecha, setFecha]       = useState(task.fecha_limite ? String(task.fecha_limite).slice(0, 10) : '')
  const [guardando, setGuardando] = useState(false)

  const estado = ETIQUETA_ESTADO[task.estado] ?? { label: task.estado, mod: 'gris' }

  // handleGuardar
  // Qué hace: llama a onFechaChange con la fecha seleccionada (o null si
  // el campo está vacío) y cierra el modal tras guardar.
  const handleGuardar = async () => {
    setGuardando(true)

    try {
      await onFechaChange(task.id, fecha || null)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  // handleKeyDown
  // Qué hace: permite cerrar el modal con la tecla Escape.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') onClose()
  }

  return (
    // Backdrop semitransparente: clic fuera del modal lo cierra.
    <div
      className="cal-modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de tarea: ${task.titulo}`}
    >
      {/* Tarjeta del modal: stopPropagation para no cerrar al hacer clic dentro */}
      <div
        className="cal-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          className="cal-modal__cerrar"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* Título */}
        <h2 className="cal-modal__titulo">{task.titulo}</h2>

        {/* Badges contextuales: ruta y step de origen */}
        <div className="cal-modal__badges">
          {task.route && (
            <span className="cal-badge cal-badge--ruta" title={task.route.titulo}>
               {task.route.titulo}
            </span>
          )}
          {task.step && (
            <span className="cal-badge cal-badge--step">
               Paso {task.step.orden}: {task.step.titulo}
            </span>
          )}
          <span className={`cal-badge cal-badge--${estado.mod}`}>
            {estado.label}
          </span>
        </div>

        {/* Descripción */}
        {task.descripcion && (
          <section className="cal-modal__seccion">
            <h3 className="cal-modal__seccion-titulo">Descripción</h3>
            <p className="cal-modal__texto">{task.descripcion}</p>
          </section>
        )}

        {/* Notas */}
        {task.notas && (
          <section className="cal-modal__seccion">
            <h3 className="cal-modal__seccion-titulo">Notas</h3>
            <p className="cal-modal__texto">{task.notas}</p>
          </section>
        )}

        {/* Fecha límite editable */}
        <section className="cal-modal__seccion">
          <h3 className="cal-modal__seccion-titulo">Fecha límite</h3>
          <div className="cal-modal__fecha-row">
            <input
              type="date"
              className="cal-modal__fecha-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha límite"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleGuardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar fecha'}
            </button>
          </div>

          {/* Botón para añadir la tarea a Google Calendar. Si no tiene
              fecha_limite guardada, se muestra deshabilitado con tooltip. */}
          <div className="cal-modal__google-row">
            {task.fecha_limite ? (
              <a
                href={generarUrlGoogleCalendar(task)}
                target="_blank"
                rel="noopener noreferrer"
                className="cal-export-btn cal-export-btn--google"
              >
                Google Calendar
              </a>
            ) : (
              <span
                className="cal-export-btn cal-export-btn--google cal-export-btn--disabled"
                title="Asigna una fecha límite primero"
              >
                Google Calendar
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default TaskDetailModal
