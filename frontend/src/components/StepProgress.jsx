// StepProgress
// Qué hace: muestra una barra de progreso visual y un texto con el número
// de tareas completadas, el total de tareas y el porcentaje, para el step
// (planeta) seleccionado en el SolarSystem.
// Por qué existe: da una visión rápida de cuánto queda del tablero Trello
// de un step sin tener que revisar columna por columna.
// Recibe: tasks (array de tareas del step; puede estar vacío).
// Devuelve: la barra de progreso y el texto de resumen.
function StepProgress({ tasks }) {
  const total = tasks.length
  const completadas = tasks.filter((tarea) => tarea.estado === 'completada').length
  const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100)

  return (
    <div className="step-progress">
      <div className="step-progress__barra">
        <div className="step-progress__relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="step-progress__texto">
        {completadas} de {total} tareas completadas ({porcentaje}%)
      </p>
    </div>
  )
}

export default StepProgress
