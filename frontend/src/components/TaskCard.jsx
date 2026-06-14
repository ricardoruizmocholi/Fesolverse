import { Draggable } from '@hello-pangea/dnd'

// TaskCard
// Qué hace: tarjeta de una tarea dentro de una columna del TrelloBoard.
// Muestra el título, la fecha límite (si tiene) y un indicador si tiene
// notas. Es "draggable" (se integra con @hello-pangea/dnd) y, como
// alternativa al drag and drop, incluye botones "◀"/"▶" para moverla a la
// columna anterior/siguiente, además de un botón para eliminarla (con
// confirmación).
// Por qué existe: es la pieza reutilizable que TrelloBoard usa para
// renderizar cada tarea de cada columna.
// Recibe: task (la tarea), index (posición dentro de la columna, requerido
// por Draggable), onClick (abre el TaskModal con esta tarea), onDelete
// (elimina la tarea), onMove (mueve la tarea a la columna anterior o
// siguiente), puedeMoverIzquierda y puedeMoverDerecha (booleans que activan
// o desactivan los botones "◀"/"▶" según la columna actual).
// Devuelve: la tarjeta arrastrable de la tarea.
function TaskCard({ task, index, onClick, onDelete, onMove, puedeMoverIzquierda, puedeMoverDerecha }) {
  // handleEliminar
  // Qué hace: pide confirmación antes de eliminar la tarea, para evitar
  // borrados accidentales, y evita que el click abra también el TaskModal.
  const handleEliminar = (event) => {
    event.stopPropagation()

    if (window.confirm(`¿Eliminar la tarea "${task.titulo}"?`)) {
      onDelete(task)
    }
  }

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card${snapshot.isDragging ? ' task-card--arrastrando' : ''}`}
          onClick={() => onClick(task)}
        >
          <p className="task-card__titulo">{task.titulo}</p>

          {(task.fecha_limite || task.notas) && (
            <div className="task-card__meta">
              {task.fecha_limite && <span className="task-card__fecha">📅 {task.fecha_limite}</span>}
              {task.notas && <span className="task-card__notas" title="Tiene notas">📝</span>}
            </div>
          )}

          {/* Fallback sin drag and drop: botones para mover de columna. */}
          <div className="task-card__acciones">
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onMove(task, -1) }}
              disabled={!puedeMoverIzquierda}
              aria-label="Mover a la columna anterior"
            >
              ◀
            </button>
            <button type="button" onClick={handleEliminar} aria-label="Eliminar tarea">
              🗑
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onMove(task, 1) }}
              disabled={!puedeMoverDerecha}
              aria-label="Mover a la columna siguiente"
            >
              ▶
            </button>
          </div>
        </article>
      )}
    </Draggable>
  )
}

export default TaskCard
