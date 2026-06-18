import { useEffect, useState } from 'react'
import api from '../api/axios'
import CalendarMonthView from '../components/calendar/CalendarMonthView'
import CalendarWeekView from '../components/calendar/CalendarWeekView'
import TaskDetailModal from '../components/calendar/TaskDetailModal'

// escaparIcs
// Escapa caracteres especiales en valores de texto iCalendar (RFC 5545):
// backslash → \\, punto y coma → \;, coma → \,.
function escaparIcs(texto) {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

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

// generarContenidoIcs
// Genera el contenido completo de un archivo .ics (iCalendar RFC 5545) a
// partir de un array de tasks con fecha_limite. Cada task se convierte en un
// VEVENT de un día completo. Compatible con Google Calendar, Apple Calendar
// y Outlook.
function generarContenidoIcs(tasks) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fesolverse//ES',
    'X-WR-CALNAME:Fesolverse - Mi Plan',
    'X-WR-TIMEZONE:Europe/Madrid',
  ]

  for (const task of tasks) {
    if (!task.fecha_limite) continue

    const inicio = fechaAFormatoIcs(task.fecha_limite)
    const fin = fechaSiguienteIcs(task.fecha_limite)

    const partes = [
      task.route ? `Ruta: ${task.route.titulo}` : '',
      task.step ? `Paso: ${task.step.titulo}` : '',
      task.descripcion || '',
    ].filter(Boolean)

    // Cada parte se escapa individualmente; se unen con \\n (representación
    // ICS de un salto de línea dentro de un valor de texto).
    const descripcion = partes.map(escaparIcs).join('\\n')

    lineas.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@fesolverse`,
      `DTSTART;VALUE=DATE:${inicio}`,
      `DTEND;VALUE=DATE:${fin}`,
      `SUMMARY:${escaparIcs(task.titulo)}`,
      `DESCRIPTION:${descripcion}`,
      `STATUS:${task.estado === 'completada' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      'END:VEVENT',
    )
  }

  lineas.push('END:VCALENDAR')
  return lineas.join('\r\n')
}

// CalendarPage
// Qué hace: página del Calendario centralizado. Carga TODAS las tasks del
// usuario (GET /calendar/tasks) una sola vez al montar y las guarda en
// estado local; las vistas Mes y Sprint filtran/agrupan estas tasks en
// memoria para no hacer peticiones adicionales al cambiar de mes o semana.
// Permite:
//   - Alternar entre vista Mes () y vista Sprint semanal ().
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

  // handleExportarIcs
  // Genera un archivo .ics con todas las tasks que tienen fecha_limite y lo
  // descarga automáticamente. La generación es 100% client-side con Blob +
  // URL.createObjectURL, sin llamadas al backend.
  const handleExportarIcs = () => {
    const conFecha = tasks.filter((t) => t.fecha_limite)

    if (conFecha.length === 0) {
      alert('No tienes tareas con fechas asignadas para exportar.')
      return
    }

    const contenido = generarContenidoIcs(conFecha)
    const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `fesolverse-calendario-${new Date().toISOString().slice(0, 10)}.ics`
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
    URL.revokeObjectURL(url)
  }

  // Número de tasks con fecha_limite asignada (para el mensaje vacío).
  const tasksConFecha = tasks.filter((t) => t.fecha_limite)

  return (
    <div className="cal-page">
      <div className="cal-page__cabecera">
        <h1 className="cal-page__titulo">Calendario</h1>

        <div className="cal-page__acciones">
          {/* Botón de exportación .ics: descarga un archivo compatible con
              Google Calendar, Apple Calendar y Outlook con todas las tasks
              que tienen fecha_limite asignada. */}
          <button
            type="button"
            className="cal-export-btn cal-export-btn--ics"
            onClick={handleExportarIcs}
            disabled={cargando}
          >
            Exportar calendario (.ics)
          </button>

          {/* Toggle de vista: Mes / Sprint semanal */}
          <div className="cal-toggle">
            <button
              type="button"
              className={`cal-toggle__btn${vista === 'mes' ? ' cal-toggle__btn--activo' : ''}`}
              onClick={() => setVista('mes')}
            >
               Mes
            </button>
            <button
              type="button"
              className={`cal-toggle__btn${vista === 'semana' ? ' cal-toggle__btn--activo' : ''}`}
              onClick={() => setVista('semana')}
            >
               Semana
            </button>
          </div>
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
