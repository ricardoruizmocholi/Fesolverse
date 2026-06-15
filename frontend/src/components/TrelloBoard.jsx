import { useEffect, useState } from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import api from '../api/axios'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'

// COLUMNAS
// Por qué existe: define las tres columnas del tablero, en orden. "id" es
// el valor que se guarda en el campo "estado" de cada task; "titulo" es el
// texto que se muestra en la cabecera de la columna.
const COLUMNAS = [
  { id: 'pendiente', titulo: 'Por hacer' },
  { id: 'en_progreso', titulo: 'En progreso' },
  { id: 'completada', titulo: 'Completado' },
]

// TrelloBoard
// Qué hace: tablero de tareas tipo Trello del step (planeta) seleccionado,
// con una columna por cada valor de "estado". Carga las tareas del step al
// montarse (GET /steps/{step}/tasks), permite arrastrar tarjetas entre
// columnas con @hello-pangea/dnd (actualización optimista + PATCH
// /tasks/{task}/move), añadir tareas nuevas con el botón "+" de cada
// columna (POST /steps/{step}/tasks) y abrir el detalle de una tarea con
// TaskModal. Como alternativa al drag and drop, cada TaskCard incluye
// botones "◀"/"▶" que mueven la tarea a la columna anterior/siguiente.
// Por qué existe: es el sistema de progreso tipo Trello de la Fase 5,
// mostrado debajo del SolarSystem al seleccionar un planeta/step.
// Recibe: step (el step seleccionado) y onTasksChange (avisa al Dashboard
// de la lista de tareas actualizada, para que StepProgress recalcule el
// porcentaje de progreso).
// Devuelve: las tres columnas del tablero y, si hay una tarea seleccionada,
// el TaskModal con su detalle.
function TrelloBoard({ step, onTasksChange }) {
  const [tasks, setTasks] = useState(step.tasks || [])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null)
  // Columna en la que se está mostrando el input para crear una tarea nueva
  // (null si no hay ninguno abierto).
  const [columnaCreando, setColumnaCreando] = useState(null)
  // Texto escrito en el input de "nueva tarea".
  const [tituloNuevaTarea, setTituloNuevaTarea] = useState('')

  // actualizarTasks
  // Qué hace: actualiza el estado local de tareas y avisa al Dashboard
  // (onTasksChange) con la misma lista, para que StepProgress se mantenga
  // sincronizado con el tablero.
  const actualizarTasks = (nuevasTasks) => {
    setTasks(nuevasTasks)
    onTasksChange(nuevasTasks)
  }

  // Carga las tareas del step seleccionado al montar el tablero o al
  // cambiar de step.
  useEffect(() => {
    let activo = true

    const cargarTareas = async () => {
      setCargando(true)
      setError('')

      try {
        const response = await api.get(`/steps/${step.id}/tasks`)

        if (activo) {
          actualizarTasks(response.data.data.tasks)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar las tareas de este paso.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarTareas()

    return () => { activo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  // tareasDeColumna
  // Qué hace: filtra las tareas que pertenecen a una columna (estado) y las
  // ordena por "orden", para pintarlas en su columna del tablero.
  const tareasDeColumna = (columnaId) => tasks
    .filter((tarea) => tarea.estado === columnaId)
    .sort((a, b) => a.orden - b.orden)

  // moverTarea
  // Qué hace: cambia el "estado" (columna) y el "orden" de una tarea.
  // Actualiza primero el estado local de forma optimista y, después, llama
  // a PATCH /tasks/{task}/move. Si la llamada falla, recarga las tareas
  // desde el backend para deshacer el cambio optimista.
  // Recibe: taskId, nuevoEstado y nuevoOrden.
  const moverTarea = async (taskId, nuevoEstado, nuevoOrden) => {
    actualizarTasks(tasks.map((tarea) => (
      tarea.id === taskId ? { ...tarea, estado: nuevoEstado, orden: nuevoOrden } : tarea
    )))

    try {
      await api.patch(`/tasks/${taskId}/move`, { estado: nuevoEstado, orden: nuevoOrden })
    } catch {
      setError('No se ha podido mover la tarea.')

      try {
        const response = await api.get(`/steps/${step.id}/tasks`)
        actualizarTasks(response.data.data.tasks)
      } catch {
        // Si tampoco se puede recargar, dejamos el cambio optimista tal cual.
      }
    }
  }

  // handleDragEnd
  // Qué hace: se ejecuta al soltar una tarjeta arrastrada con
  // @hello-pangea/dnd. Si se suelta fuera de cualquier columna, o en la
  // misma posición de la que salió, no hace nada; en caso contrario, mueve
  // la tarea a la columna y posición de destino.
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    moverTarea(Number(draggableId), destination.droppableId, destination.index)
  }

  // moverConBotones
  // Qué hace: alternativa al drag and drop. Mueve una tarea a la columna
  // anterior (direccion = -1) o siguiente (direccion = 1), colocándola al
  // final de esa columna. Si no existe columna en esa dirección, no hace nada.
  const moverConBotones = (tarea, direccion) => {
    const indiceActual = COLUMNAS.findIndex((columna) => columna.id === tarea.estado)
    const nuevaColumna = COLUMNAS[indiceActual + direccion]

    if (!nuevaColumna) return

    const nuevoOrden = tareasDeColumna(nuevaColumna.id).length
    moverTarea(tarea.id, nuevaColumna.id, nuevoOrden)
  }

  // crearTarea
  // Qué hace: crea una tarea nueva en la columna indicada (POST
  // /steps/{step}/tasks) con el título escrito en el input de "nueva tarea"
  // (estado "tituloNuevaTarea"). Si la creación tiene éxito, añade la tarea
  // devuelta por el backend al estado local y cierra el input.
  // Recibe: columnaId (estado/columna donde se crea la tarea).
  const crearTarea = async (columnaId) => {
    const titulo = tituloNuevaTarea.trim()

    if (!titulo) return

    setError('')

    try {
      const response = await api.post(`/steps/${step.id}/tasks`, {
        titulo,
        estado: columnaId,
      })

      actualizarTasks([...tasks, response.data.data.task])
      setColumnaCreando(null)
      setTituloNuevaTarea('')
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido crear la tarea.')
    }
  }

  // alternarInputNuevaTarea
  // Qué hace: abre el input de "nueva tarea" de la columna pulsada (y limpia
  // su texto), o lo cierra si ya estaba abierto para esa misma columna.
  const alternarInputNuevaTarea = (columnaId) => {
    if (columnaCreando === columnaId) {
      setColumnaCreando(null)
    } else {
      setColumnaCreando(columnaId)
      setTituloNuevaTarea('')
    }
  }

  // eliminarTarea
  // Qué hace: elimina una tarea (DELETE /tasks/{task}) y, si tiene éxito,
  // la quita del estado local.
  const eliminarTarea = async (tarea) => {
    setError('')

    try {
      await api.delete(`/tasks/${tarea.id}`)
      actualizarTasks(tasks.filter((t) => t.id !== tarea.id))
    } catch (err) {
      setError(err.response?.data?.message || 'No se ha podido eliminar la tarea.')
    }
  }

  // handleTaskSaved / handleTaskDeleted
  // Qué hacen: sincronizan el estado local del tablero con los cambios
  // hechos desde el TaskModal (editar o eliminar una tarea).
  const handleTaskSaved = (tareaActualizada) => {
    actualizarTasks(tasks.map((tarea) => (
      tarea.id === tareaActualizada.id ? tareaActualizada : tarea
    )))
  }

  const handleTaskDeleted = (taskId) => {
    actualizarTasks(tasks.filter((tarea) => tarea.id !== taskId))
  }

  if (cargando) {
    return <p>Cargando tareas...</p>
  }

  return (
    <div className="trello-board">
      {error && <p role="alert" className="trello-board__error">{error}</p>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="trello-board__columnas">
          {COLUMNAS.map((columna, indiceColumna) => {
            const tareasColumna = tareasDeColumna(columna.id)

            return (
              <Droppable droppableId={columna.id} key={columna.id}>
                {(provided) => (
                  <div className={`trello-columna trello-columna--${columna.id}`} ref={provided.innerRef} {...provided.droppableProps}>
                    <div className="trello-columna__cabecera">
                      <h4>{columna.titulo}</h4>
                      <button
                        type="button"
                        onClick={() => alternarInputNuevaTarea(columna.id)}
                        aria-label={`Añadir tarea a ${columna.titulo}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Input para crear una tarea nueva en esta columna. */}
                    {columnaCreando === columna.id && (
                      <div className="trello-columna__nueva-tarea">
                        <input
                          type="text"
                          value={tituloNuevaTarea}
                          onChange={(event) => setTituloNuevaTarea(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') crearTarea(columna.id)
                            if (event.key === 'Escape') setColumnaCreando(null)
                          }}
                          placeholder="Título de la tarea"
                          autoFocus
                        />
                        <div className="trello-columna__nueva-tarea-botones">
                          <button type="button" onClick={() => crearTarea(columna.id)}>
                            Añadir
                          </button>
                          <button type="button" onClick={() => setColumnaCreando(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {tareasColumna.map((tarea, indice) => (
                      <TaskCard
                        key={tarea.id}
                        task={tarea}
                        index={indice}
                        onClick={setTareaSeleccionada}
                        onDelete={eliminarTarea}
                        onMove={moverConBotones}
                        puedeMoverIzquierda={indiceColumna > 0}
                        puedeMoverDerecha={indiceColumna < COLUMNAS.length - 1}
                      />
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>

      {tareaSeleccionada && (
        <TaskModal
          task={tareaSeleccionada}
          onClose={() => setTareaSeleccionada(null)}
          onSave={handleTaskSaved}
          onDelete={handleTaskDeleted}
        />
      )}
    </div>
  )
}

export default TrelloBoard
