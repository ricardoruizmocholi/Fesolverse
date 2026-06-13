// RouteCard
// Qué hace: muestra una tarjeta con el resumen de una ruta de aprendizaje
// generada por la IA (título, destino espacial, dificultad y duración
// estimada) y la lista de pasos que la componen, cada uno con su título,
// descripción y proyecto de aprendizaje.
// Por qué existe: es la pieza reutilizable que el Dashboard usa para
// renderizar cada ruta del usuario.
// Recibe: route (objeto con los datos de la ruta y su array "steps").
// Devuelve: la tarjeta con el resumen y los pasos de la ruta.
function RouteCard({ route }) {
  return (
    <article>
      <h4>{route.titulo}</h4>

      <p>Destino espacial: {route.destino_espacial}</p>
      <p>Dificultad: {route.dificultad}</p>
      <p>Duración estimada: {route.tiempo_estimado_semanas} semanas</p>
      <p>Estado: {route.estado}</p>

      {route.steps && route.steps.length > 0 && (
        <ol>
          {route.steps.map((step) => (
            <li key={step.id}>
              <strong>{step.titulo}</strong>
              <p>{step.descripcion}</p>
              <p>Proyecto de aprendizaje: {step.proyecto_aprendizaje}</p>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

export default RouteCard
