import { useState } from 'react'
import api from '../api/axios'

// Opciones del campo "estado" del formulario, con el mismo texto que las
// columnas del TrelloBoard para que el usuario las reconozca.
const ESTADOS = [
  { value: 'pendiente', label: 'Por hacer' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completada', label: 'Completado' },
]

// TaskModal
// Qué hace: modal para ver y editar todos los campos de una tarea (título,
// descripción, estado, fecha límite y notas). El botón "Guardar" llama a
// PUT /tasks/{task}, el botón "Eliminar" llama a DELETE /tasks/{task} (con
// confirmación) y el botón "Cerrar" cierra el modal sin guardar.
// Por qué existe: es la vista de detalle de una tarea, que se abre al hacer
// click en su TaskCard dentro del TrelloBoard.
// Recibe: task (la tarea a editar), onClose (cierra el modal), onSave
// (avisa al TrelloBoard de que la tarea se ha actualizado, con la tarea ya
// actualizada) y onDelete (avisa al TrelloBoard de que la tarea se ha
// eliminado, con su id).
// Devuelve: el modal con el formulario de edición.
function TaskModal({ task, onClose, onSave, onDelete }) {
  const [titulo, setTitulo] = useState(task.titulo)
  const [descripcion, setDescripcion] = useState(task.descripcion || '')
  const [estado, setEstado] = useState(task.estado)
  const [fechaLimite, setFechaLimite] = useState(task.fecha_limite || '')
  const [notas, setNotas] = useState(task.notas || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // handleGuardar
  // Qué hace: envía los campos editados al backend (PUT /tasks/{task}) y,
  // si la respuesta es correcta, avisa al TrelloBoard mediante onSave con la
  // tarea ya actualizada y cierra el modal. Si falla, muestra el mensaje de
  // error devuelto por el backend.
  const handleGuardar = async () => {
    setGuardando(true)
    setError('')

    try {
      const response = await api.put(`/tasks/${task.id}`, {
        titulo,
        descripcion,
        estado,
        fecha_limite: fechaLimite || null,
        notas,
      })

      onSave(response.data.data.task)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido guardar la tarea.')
      setGuardando(false)
    }
  }

  // handleEliminar
  // Qué hace: pide confirmación, elimina la tarea (DELETE /tasks/{task}) y,
  // si se elimina correctamente, avisa al TrelloBoard mediante onDelete y
  // cierra el modal.
  const handleEliminar = async () => {
    if (!window.confirm(`¿Eliminar la tarea "${task.titulo}"?`)) {
      return
    }

    setGuardando(true)
    setError('')

    try {
      await api.delete(`/tasks/${task.id}`)
      onDelete(task.id)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido eliminar la tarea.')
      setGuardando(false)
    }
  }

  return (
    <div className="task-modal__fondo" onClick={onClose}>
      {/* Detiene la propagación para que un click dentro del modal no lo cierre. */}
      <div className="task-modal" onClick={(event) => event.stopPropagation()}>
        <button className="task-modal__cerrar" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <h4>Editar tarea</h4>

        {error && <p role="alert" className="form-error">{error}</p>}

        <div>
          <label htmlFor="task-titulo">Título</label>
          <input
            id="task-titulo"
            type="text"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="task-descripcion">Descripción</label>
          <textarea
            id="task-descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="task-estado">Estado</label>
          <select id="task-estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
            {ESTADOS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-fecha-limite">Fecha límite</label>
          <input
            id="task-fecha-limite"
            type="date"
            value={fechaLimite}
            onChange={(event) => setFechaLimite(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="task-notas">Notas</label>
          <textarea
            id="task-notas"
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
          />
        </div>

        <div className="task-modal__botones">
          <button type="button" className="btn-primary" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="btn-danger" onClick={handleEliminar} disabled={guardando}>
            Eliminar
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskModal
