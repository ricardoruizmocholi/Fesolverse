import { useEffect, useState } from 'react'
import api from '../api/axios'
import CalendarMonthView from '../components/calendar/CalendarMonthView'
import CalendarWeekView from '../components/calendar/CalendarWeekView'
import TaskDetailModal from '../components/calendar/TaskDetailModal'

// CalendarPage
// Qué hace: página del Calendario centralizado. Carga TODAS las tasks del
// usuario (GET /calendar/tasks) una sola vez al montar y las guarda en
// estado local; las vistas Mes y Sprint filtran/agrupan estas tasks en
// memoria para no hacer peticiones adicionales al cambiar de mes o semana.
// Permite:
//   - Alternar entre vista Mes (📅) y vista Sprint semanal (📋).
//   - Abrir el TaskDetailModal al hacer clic en una task.
//   - Actualizar la fecha_limite de una task con actualización optimista:
//     se cambia el estado local inmediatamente y se llama a
//     PATCH /tasks/{task}/fecha; si el backend falla se revierte.
// Por qué existe: el Dashboard muestra las tareas por ruta/step de forma
// aislada. Esta página ofrece una vista global tipo Jira donde el usuario
// puede ver y reorganizar todas sus tareas con fechas en un solo lugar.
// Recibe: nada (usa el contexto de autenticación vía el interceptor de api).
// Devuelve: la página del calendario con su toggle de vista y los componentes
// de calendario.
function CalendarPage() {
  const [tasks, setTasks]               = useState([])
  const [cargando, setCargando]         = useState(true)
  const [error, setError]               = useState('')
  // 'mes' | 'semana'
  const [vista, setVista]               = useState('mes')
  // Task actualmente seleccionada para mostrar en el modal de detalle.
  const [taskModal, setTaskModal]       = useState(null)

  // Cargar todas las tasks al montar la página. No filtramos por rango aquí:
  // las vistas filtran en memoria para evitar peticiones al navegar.
  useEffect(() => {
    let activo = true

    const cargar = async () => {
      try {
        const res = await api.get('/calendar/tasks')

        if (activo) {
          setTasks(res.data.data.tasks)
        }
      } catch {
        if (activo) {
          setError('No se han podido cargar las tareas del calendario.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargar()

    return () => { activo = false }
  }, [])

  // handleFechaChange
  // Qué hace: actualización optimista de la fecha_limite de una task.
  //   1. Guarda el estado anterior para poder revertir si falla el backend.
  //   2. Actualiza el estado local inmediatamente (el UI responde al instante).
  //   3. Llama a PATCH /tasks/{task}/fecha.
  //   4. Si el backend falla, revierte al estado anterior.
  // Recibe: taskId (number), nuevaFecha (string YYYY-MM-DD | null).
  const handleFechaChange = async (taskId, nuevaFecha) => {
    const prevTasks = tasks

    // Actualización optimista.
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, fecha_limite: nuevaFecha } : t))
    )

    try {
      await api.patch(`/tasks/${taskId}/fecha`, { fecha_limite: nuevaFecha })
    } catch {
      // Revertir si el backend devuelve error.
      setTasks(prevTasks)
      setError('No se ha podido actualizar la fecha. Inténtalo de nuevo.')
    }
  }

  // Número de tasks con fecha_limite asignada (para el mensaje vacío).
  const tasksConFecha = tasks.filter((t) => t.fecha_limite)

  return (
    <div className="cal-page">
      <div className="cal-page__cabecera">
        <h1 className="cal-page__titulo">Calendario</h1>

        {/* Toggle de vista: Mes / Sprint semanal */}
        <div className="cal-toggle">
          <button
            type="button"
            className={`cal-toggle__btn${vista === 'mes' ? ' cal-toggle__btn--activo' : ''}`}
            onClick={() => setVista('mes')}
          >
            📅 Mes
          </button>
          <button
            type="button"
            className={`cal-toggle__btn${vista === 'semana' ? ' cal-toggle__btn--activo' : ''}`}
            onClick={() => setVista('semana')}
          >
            📋 Sprint semanal
          </button>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <p role="alert" className="cal-page__error">{error}</p>
      )}

      {cargando ? (
        <p className="cal-page__estado">Cargando tareas…</p>
      ) : tasksConFecha.length === 0 && vista === 'mes' ? (
        /* Mensaje vacío solo en vista mes si no hay ninguna task con fecha */
        <p className="cal-page__estado cal-page__estado--vacio">
          Asigna fechas límite a tus tareas desde el tablero de cada ruta,
          o arrástralas aquí directamente en la vista Sprint semanal.
        </p>
      ) : (
        <>
          {vista === 'mes' && (
            <CalendarMonthView
              tasks={tasks}
              onTaskClick={setTaskModal}
            />
          )}

          {vista === 'semana' && (
            <CalendarWeekView
              tasks={tasks}
              onTaskClick={setTaskModal}
              onFechaChange={handleFechaChange}
            />
          )}
        </>
      )}

      {/* Modal de detalle de task (mes y semana) */}
      {taskModal && (
        <TaskDetailModal
          task={taskModal}
          onClose={() => setTaskModal(null)}
          onFechaChange={handleFechaChange}
        />
      )}
    </div>
  )
}

export default CalendarPage
