import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  parseISO,
  isSameDay,
  format,
  isToday,
} from 'date-fns'
import { es } from 'date-fns/locale'

// ID especial del droppable "Sin fecha" (tasks con fecha_limite null).
const SIN_FECHA_ID = 'sin-fecha'

// ETIQUETA_ESTADO
// Qué hace: mapea el valor de "estado" a la etiqueta legible y al modificador
// CSS del badge de color de cada tarjeta de task.
const ETIQUETA_ESTADO = {
  pendiente:   { label: 'Pendiente',   mod: 'gris'  },
  en_progreso: { label: 'En progreso', mod: 'cyan'  },
  completada:  { label: 'Completada',  mod: 'verde' },
}

// CalendarWeekView
// Qué hace: vista semanal (sprint) del calendario. Muestra 7 columnas
// (Lun-Dom) más una columna especial "Sin fecha", una por día de la semana
// visible. Cada columna es un Droppable de @hello-pangea/dnd: las tarjetas
// de tasks se pueden arrastrar entre días para cambiar su fecha_limite.
// Al soltar una tarjeta en otro día se hace un update optimista en el estado
// local y se llama a onFechaChange (que llama a PATCH /tasks/{task}/fecha).
// Si el backend falla, CalendarPage revierte el cambio.
// Recibe:
//   tasks         — todas las tasks ya cargadas (array).
//   onTaskClick   — callback con la task seleccionada, para abrir el modal.
//   onFechaChange — callback(taskId, nuevaFechaString|null) para persistir.
// Devuelve: el grid semanal con drag and drop.
function CalendarWeekView({ tasks, onTaskClick, onFechaChange }) {
  // semana representa cualquier fecha dentro de la semana visible.
  const [semana, setSemana] = useState(() => new Date())

  // Calcular los 7 días de la semana (Lunes a Domingo).
  const inicioSemana = startOfWeek(semana, { weekStartsOn: 1 })
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i))

  // tasksDeDia
  // Qué hace: filtra las tasks cuya fecha_limite coincide con el día dado.
  // Recibe: día (Date). Devuelve: array de tasks.
  const tasksDeDia = (dia) =>
    tasks.filter((task) => {
      if (!task.fecha_limite) return false
      return isSameDay(parseISO(String(task.fecha_limite)), dia)
    })

  const tasksSinFecha = tasks.filter((task) => !task.fecha_limite)

  // handleDragEnd
  // Qué hace: se ejecuta al soltar una tarjeta arrastrada. Si se suelta
  // fuera de cualquier droppable, o en el mismo droppable de origen, no hace
  // nada. Si se suelta en otro día, calcula la nueva fecha_limite (o null si
  // el destino es "sin-fecha") y llama a onFechaChange.
  // Por qué es optimista: onFechaChange actualiza el estado local de forma
  // inmediata antes de recibir respuesta del backend; si la llamada falla,
  // CalendarPage revierte al estado anterior.
  const handleDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return
    if (source.droppableId === destination.droppableId) return

    const taskId    = Number(draggableId)
    const nuevaFecha = destination.droppableId === SIN_FECHA_ID
      ? null
      : destination.droppableId // formato YYYY-MM-DD

    onFechaChange(taskId, nuevaFecha)
  }

  return (
    <div className="cal-semana">
      {/* Cabecera de navegación */}
      <div className="cal-mes__nav">
        <button
          type="button"
          className="cal-nav-btn"
          aria-label="Semana anterior"
          onClick={() => setSemana((s) => subWeeks(s, 1))}
        >
          &#8249;
        </button>

        <h2 className="cal-mes__titulo">
          Semana del {format(inicioSemana, 'd MMM', { locale: es })}
          {' – '}
          {format(addDays(inicioSemana, 6), 'd MMM yyyy', { locale: es })}
        </h2>

        <button
          type="button"
          className="cal-nav-btn"
          aria-label="Semana siguiente"
          onClick={() => setSemana((s) => addWeeks(s, 1))}
        >
          &#8250;
        </button>
      </div>

      {/* Grid de columnas con drag and drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="cal-semana__grid">
          {/* Una columna por cada día de la semana */}
          {dias.map((dia) => {
            const droppableId = format(dia, 'yyyy-MM-dd')
            const tareas      = tasksDeDia(dia)
            const esHoy       = isToday(dia)

            return (
              <div
                key={droppableId}
                className={`cal-semana__col${esHoy ? ' cal-semana__col--hoy' : ''}`}
              >
                <div className="cal-semana__col-cabecera">
                  {format(dia, 'EEE d', { locale: es })}
                  <span className="cal-semana__col-mes">
                    {format(dia, 'MMM', { locale: es })}
                  </span>
                </div>

                <Droppable droppableId={droppableId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`cal-semana__col-tareas${snapshot.isDraggingOver ? ' cal-semana__col-tareas--over' : ''}`}
                    >
                      {tareas.map((tarea, indice) => (
                        <TareaCard
                          key={tarea.id}
                          tarea={tarea}
                          indice={indice}
                          onClick={onTaskClick}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}

          {/* Columna especial: tasks sin fecha_limite */}
          <div className="cal-semana__col cal-semana__col--sin-fecha">
            <div className="cal-semana__col-cabecera">
              Sin fecha
            </div>

            <Droppable droppableId={SIN_FECHA_ID}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`cal-semana__col-tareas${snapshot.isDraggingOver ? ' cal-semana__col-tareas--over' : ''}`}
                >
                  {tasksSinFecha.map((tarea, indice) => (
                    <TareaCard
                      key={tarea.id}
                      tarea={tarea}
                      indice={indice}
                      onClick={onTaskClick}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}

// TareaCard
// Qué hace: tarjeta de una task dentro de la vista semanal. Es un Draggable
// de @hello-pangea/dnd. Muestra el título de la task, un badge con el nombre
// corto de la ruta de origen y un badge de color según el estado.
// Recibe:
//   tarea  — objeto task con step y route.
//   indice — posición dentro de su columna (necesario para Draggable).
//   onClick — callback para abrir el TaskDetailModal.
// Devuelve: la tarjeta arrastrable.
function TareaCard({ tarea, indice, onClick }) {
  const estado = ETIQUETA_ESTADO[tarea.estado] ?? { label: tarea.estado, mod: 'gris' }

  return (
    <Draggable draggableId={String(tarea.id)} index={indice}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cal-tarea-card${snapshot.isDragging ? ' cal-tarea-card--dragging' : ''}`}
          onClick={() => onClick(tarea)}
        >
          <p className="cal-tarea-card__titulo">{tarea.titulo}</p>

          <div className="cal-tarea-card__badges">
            {/* Nombre corto de la ruta de origen */}
            <span className="cal-badge cal-badge--ruta" title={tarea.route?.titulo}>
              {tarea.route?.titulo?.slice(0, 18) ?? '—'}
            </span>

            {/* Estado de la task */}
            <span className={`cal-badge cal-badge--${estado.mod}`}>
              {estado.label}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default CalendarWeekView
