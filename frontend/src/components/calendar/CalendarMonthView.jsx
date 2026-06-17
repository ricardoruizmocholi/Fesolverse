import { useState } from 'react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'

// Cabeceras de columna para la cuadrícula (Lunes a Domingo).
const CABECERAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// COLOR_ESTADO
// Qué hace: mapea cada valor del campo "estado" de una task al nombre de
// modificador CSS utilizado para colorear el borde de las mini-tarjetas.
const COLOR_ESTADO = {
  pendiente:   'gris',
  en_progreso: 'cyan',
  completada:  'verde',
}

// CalendarMonthView
// Qué hace: vista mensual del calendario. Muestra una cuadrícula de 7
// columnas (Lun-Dom) con tantas filas como semanas tenga el mes visible.
// En cada celda aparece el número del día y hasta 3 mini-tarjetas de tasks
// con fecha_limite ese día; si hay más, se muestra "+N más". El día actual
// se resalta con borde naranja. Los días fuera del mes actual aparecen en
// un tono más apagado. Navegar entre meses con las flechas ‹ ›.
// Recibe:
//   tasks       — todas las tasks ya cargadas por CalendarPage (array).
//   onTaskClick — callback con la task seleccionada, para abrir el modal.
// Devuelve: el grid mensual con navegación.
function CalendarMonthView({ tasks, onTaskClick }) {
  // mes representa el primer instante del mes visible (usamos Date de JS).
  const [mes, setMes] = useState(() => new Date())

  // Calcular el rango de días que cubre la cuadrícula: empieza en el Lunes
  // de la primera semana del mes y termina en el Domingo de la última.
  const inicioGrid = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 })
  const finGrid    = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 })
  const dias       = eachDayOfInterval({ start: inicioGrid, end: finGrid })

  // tasksDelDia
  // Qué hace: filtra las tasks cuya fecha_limite coincide con el día dado.
  // Recibe: día (Date).
  // Devuelve: array de tasks de ese día.
  const tasksDelDia = (dia) =>
    tasks.filter((task) => {
      if (!task.fecha_limite) return false
      return isSameDay(parseISO(String(task.fecha_limite)), dia)
    })

  return (
    <div className="cal-mes">
      {/* Cabecera de navegación */}
      <div className="cal-mes__nav">
        <button
          type="button"
          className="cal-nav-btn"
          aria-label="Mes anterior"
          onClick={() => setMes((m) => subMonths(m, 1))}
        >
          &#8249;
        </button>

        <h2 className="cal-mes__titulo">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h2>

        <button
          type="button"
          className="cal-nav-btn"
          aria-label="Mes siguiente"
          onClick={() => setMes((m) => addMonths(m, 1))}
        >
          &#8250;
        </button>
      </div>

      {/* Cuadrícula */}
      <div className="cal-mes__grid">
        {/* Fila de cabeceras de columna */}
        {CABECERAS.map((nombre) => (
          <div key={nombre} className="cal-mes__col-nombre">
            {nombre}
          </div>
        ))}

        {/* Celdas de días */}
        {dias.map((dia) => {
          const tareas       = tasksDelDia(dia)
          const esMesActual  = isSameMonth(dia, mes)
          const esHoy        = isToday(dia)

          return (
            <div
              key={dia.toISOString()}
              className={[
                'cal-mes__celda',
                esHoy           ? 'cal-mes__celda--hoy'       : '',
                !esMesActual    ? 'cal-mes__celda--otro-mes'  : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="cal-mes__celda-num">{format(dia, 'd')}</span>

              {/* Mini-tarjetas (máx. 3) */}
              {tareas.slice(0, 3).map((tarea) => (
                <button
                  key={tarea.id}
                  type="button"
                  className={`cal-mes__tarea cal-mes__tarea--${COLOR_ESTADO[tarea.estado] ?? 'gris'}`}
                  onClick={() => onTaskClick(tarea)}
                  title={tarea.titulo}
                >
                  {tarea.titulo}
                </button>
              ))}

              {/* "+N más" si hay más de 3 tasks ese día */}
              {tareas.length > 3 && (
                <span className="cal-mes__mas">+{tareas.length - 3} más</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarMonthView
