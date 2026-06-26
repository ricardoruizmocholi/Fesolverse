# Interacciones en SolarSystem y MapView

Fecha de modificacion: 2026-06-26

## Elementos clicables en SolarSystem.jsx

### Tierra (planeta de inicio)
- Tiene onClick en su CuerpoCeleste.
- Al hacer click muestra el StepInfoPanel con:
  - Numero de orden: "Inicio"
  - Titulo: "Punto de partida"
  - Descripcion: route.punto_partida
  - Sin proyecto de aprendizaje ni duracion estimada.

### Planetas de steps intermedios
- Cada step tiene onClick (comportamiento original, sin cambios).
- Al hacer click muestra el StepInfoPanel con:
  - Numero de orden: "Paso {step.orden}"
  - Titulo: step.titulo
  - Descripcion: step.descripcion
  - Proyecto de aprendizaje: step.proyecto_aprendizaje
  - Duracion estimada: step.tiempo_estimado_semanas semanas

### Planeta destino (Luna, Marte, Jupiter, etc.)
- Tiene onClick en su CuerpoCeleste.
- Al hacer click muestra el StepInfoPanel con:
  - Numero de orden: "Meta"
  - Titulo: route.titulo
  - Descripcion: route.destino
  - Informacion adicional: "{route.destino_espacial} -- {route.dificultad} -- {route.tiempo_estimado_semanas} semanas"

## StepInfoPanel: como se extendio para inicio y destino

El StepInfoPanel original solo recibia un step con campos fijos (orden, titulo, descripcion, proyecto_aprendizaje, tiempo_estimado_semanas).

Para soportar los tres casos sin romper el comportamiento existente se usa un campo interno `_tipo` en el objeto que se pasa como step:

- `_tipo: 'inicio'`: muestra "Inicio" como numero de orden, oculta proyecto de aprendizaje y duracion.
- `_tipo: 'meta'`: muestra "Meta" como numero de orden, oculta proyecto de aprendizaje y duracion, muestra campo info_adicional si existe.
- Sin `_tipo` (steps normales): comportamiento original sin cambios.

Los objetos para inicio y meta se construyen directamente en el onClick de cada CuerpoCeleste, usando datos de route. No se modifico la estructura de los steps ni del backend.

## Elementos clicables en MapView.jsx

### CircleMarker de origen (naranja)
- Al hacer click muestra un Popup de Leaflet con:
  - Titulo: "Punto de partida"
  - Ciudad detectada por geolocalizacion (si esta disponible)
  - Descripcion: route.punto_partida

### CircleMarker de destino (verde)
- Al hacer click muestra un Popup de Leaflet con:
  - Titulo: "Destino: {destino.ciudad}"
  - Descripcion: route.destino
  - Informacion: "{route.titulo} -- {route.tiempo_estimado_semanas} semanas"

### CircleMarkers de steps intermedios (cian)
- Comportamiento original sin cambios.
- Popup con paso, titulo y duracion estimada.

## Decisiones tecnicas

1. **Campo _tipo en lugar de prop separada**: Se usa un campo `_tipo` con prefijo underscore en el objeto step para diferenciar inicio/meta de steps normales. Esto evita cambiar la firma del componente StepInfoPanel y mantiene retrocompatibilidad. El prefijo underscore indica que es un campo interno, no proveniente del backend.

2. **Construccion inline de los objetos inicio/meta**: Los objetos se crean directamente en el onClick de cada CuerpoCeleste, mapeando los campos de route a la estructura que espera StepInfoPanel (titulo, descripcion). Esto evita crear funciones auxiliares innecesarias.

3. **Ciudad de origen desde useUserLocation**: Para el popup del origen en MapView se extrae el campo `city` del hook useUserLocation (que lo obtiene por geolocalizacion del navegador o por IP). Asi se muestra la ciudad real del usuario, no la del destino.

4. **Popups de Leaflet reutilizando el patron existente**: Los popups de origen y destino en MapView siguen el mismo patron JSX que los popups de los steps intermedios (componente Popup dentro de CircleMarker), sin añadir logica adicional.

5. **Sin iconos ni emojis**: Todos los textos de la UI usan texto plano, sin iconos ni emojis, siguiendo las restricciones del proyecto.
