import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom' // 👈 Importamos Portal para aislar el arrastre
import { Draggable } from '@hello-pangea/dnd'

// TaskCard
// Qué hace: Tarjeta de tarea dentro de una columna del TrelloBoard.
// Implementa un sistema de renderizado mediante Portal para evitar conflictos 
// de coordenadas provocados por transiciones CSS o filtros de contenedores padres.
function TaskCard({ task, index, onClick, onDelete, onMove, puedeMoverIzquierda, puedeMoverDerecha }) {
  
  // Lógica de animación de encaje (Glow/Bounce al cambiar de estado)
  const estadoPrevio = useRef(task.estado)
  const [encajando, setEncajando] = useState(false)

  useEffect(() => {
    if (estadoPrevio.current !== task.estado) {
      estadoPrevio.current = task.estado
      setEncajando(true)
      const id = setTimeout(() => setEncajando(false), 550)
      return () => clearTimeout(id)
    }
  }, [task.estado])

  // Manejador para eliminar tareas con confirmación
  const handleEliminar = (event) => {
    event.stopPropagation() // Evita abrir el modal de la tarea al hacer clic en borrar
    if (window.confirm(`¿Eliminar la tarea "${task.titulo}"?`)) {
      onDelete(task)
    }
  }

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => {
        
        // 1. Definimos la estructura base de la tarjeta
        const tarjeta = (
          <article
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            // 🔥 TRUCO CRÍTICO 1: Combinamos los estilos dinámicos de la librería e inyectamos
            // 'transition: none' en tiempo real si se está arrastrando para fulminar el bug del salto.
            style={{
              ...provided.draggableProps.style,
              transition: snapshot.isDragging ? 'none' : provided.draggableProps.style?.transition,
            }}
            className={[
              'task-card',
              `task-card--${task.estado}`,
              snapshot.isDragging ? 'task-card--arrastrando' : '',
              encajando ? 'task-card--encajando' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onClick(task)}
          >
            <p className="task-card__titulo">{task.titulo}</p>

            {(task.fecha_limite || task.notas) && (
              <div className="task-card__meta">
                {task.fecha_limite && <span className="task-card__fecha">- {task.fecha_limite}</span>}
                {task.notas && <span className="task-card__notas" title="Tiene notas">📝</span>}
              </div>
            )}

            {/* Acciones de la tarjeta (Botones de movimiento alternativo y borrado) */}
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
                X
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
        )

        // 🔥 TRUCO CRÍTICO 2: Si la tarjeta se está arrastrando (isDragging es true),
        // la teletransportamos fuera de las columnas directamente al body del documento.
        if (snapshot.isDragging) {
          return createPortal(tarjeta, document.body)
        }

        // Si no se está arrastrando, se renderiza con normalidad dentro de su columna
        return tarjeta
      }}
    </Draggable>
  )
}

export default TaskCard