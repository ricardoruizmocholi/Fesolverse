# Chatbot de asistencia por tarea

Fecha de implementacion: 2026-06-26

## Arquitectura (flujo completo)

1. El usuario abre el TrelloBoard de un step y hace click en una tarea (TaskCard).
2. Se abre el TaskModal con los datos de la tarea.
3. Si el usuario puede usar el chatbot (plan pro, o plan free con menos de 5 mensajes usados en la ruta), aparece el boton "Preguntar al asistente".
4. Al hacer click se renderiza el ChatbotPanel dentro del TaskModal.
5. El usuario escribe una pregunta y pulsa "Enviar" (o Enter).
6. El frontend envia POST /tasks/{task}/chat con el mensaje.
7. El ChatbotController verifica:
   a. Que la tarea pertenece a una ruta del usuario (ownership).
   b. Que no se ha superado el limite de mensajes (solo plan free).
   c. Valida el mensaje (requerido, max 1000 caracteres).
8. Construye un prompt con contexto completo (ruta, step, tarea) y lo envia a Gemini (gemini-2.0-flash-lite).
9. Al recibir la respuesta, incrementa route.chatbot_mensajes_usados y devuelve la respuesta al frontend.
10. El ChatbotPanel muestra la respuesta y actualiza el contador local via onMensajesUsadosChange.

## Flujo de props en el frontend

```
Dashboard (user, rutaSeleccionada)
  -> TrelloBoard (step, route, user, onMensajesUsadosChange)
    -> TaskModal (task, route, user, onMensajesUsadosChange)
      -> ChatbotPanel (task, route, user, onMensajesUsadosChange, onClose)
```

onMensajesUsadosChange propaga el nuevo contador desde ChatbotPanel hasta Dashboard, donde se actualiza el objeto de la ruta en el array de rutas.

## Limite de mensajes por plan

- Plan FREE: maximo 5 mensajes por ruta (no por tarea). El contador se almacena en routes.chatbot_mensajes_usados.
- Plan PRO: sin limite.
- La verificacion se hace en el backend (ChatbotController) y tambien en el frontend (el boton se oculta si se alcanza el limite; el ChatbotPanel muestra un mensaje de upgrade).
- El contador se incrementa solo tras una respuesta exitosa de Gemini.

## Prompt enviado a Gemini

```
Eres un mentor experto que ayuda al usuario a completar tareas de aprendizaje. Responde de forma clara, practica y concisa en espanol.

CONTEXTO DE LA RUTA DE APRENDIZAJE:
- Ruta: {route.titulo}
- Destino: {route.destino}

CONTEXTO DEL PASO ACTUAL:
- Paso: {step.titulo}
- Descripcion del paso: {step.descripcion}
- Proyecto de aprendizaje: {step.proyecto_aprendizaje}

CONTEXTO DE LA TAREA:
- Tarea: {task.titulo}
- Descripcion: {task.descripcion}
- Notas del usuario: {task.notas}
- Estado actual: {task.estado}

PREGUNTA DEL USUARIO:
{mensaje del usuario}

Responde directamente a la pregunta del usuario teniendo en cuenta todo el contexto anterior. Si la pregunta no tiene relacion con la tarea o el aprendizaje, indica amablemente que solo puedes ayudar con temas relacionados con la tarea.
```

## Decisiones tecnicas

1. **Llamada directa a Gemini en ChatbotController**: No se modifica GeminiService.php (que esta disenado para generar rutas con un formato de respuesta muy especifico). El ChatbotController hace su propia llamada HTTP con el mismo patron (misma API key, mismo modelo, mismo timeout).

2. **Historial solo en memoria**: Los mensajes viven en el estado de React del ChatbotPanel. Al cerrar el panel se pierden. Esto simplifica la implementacion y evita tablas adicionales en la BD. El backend no mantiene historial de conversacion; cada mensaje se envia como una pregunta independiente con contexto completo.

3. **Contador en la tabla routes**: Se anadio la columna chatbot_mensajes_usados directamente en routes en lugar de crear una tabla intermedia. Es mas simple y la consulta es directa (route->chatbot_mensajes_usados).

4. **Validacion doble del limite**: El frontend oculta el boton y muestra mensaje de upgrade (UX), pero el backend tambien verifica el limite (seguridad). Un usuario no puede saltarse el limite manipulando el frontend.

5. **onMensajesUsadosChange como callback**: El contador se propaga hacia arriba por callbacks en lugar de usar un contexto global o re-fetching de la ruta. Esto mantiene el flujo de datos unidireccional y evita llamadas innecesarias al backend.

6. **Mensaje maximo de 1000 caracteres**: Limita el tamano de las peticiones a Gemini para evitar abuso y mantener los costes bajo control.

## Pendientes y posibles mejoras

- Persistir el historial de conversacion en la BD para que no se pierda al cerrar el panel.
- Enviar el historial previo como parte del prompt para mantener contexto entre mensajes.
- Anadir streaming de la respuesta de Gemini (SSE) para que el usuario vea la respuesta mientras se genera.
- Permitir al admin configurar el limite de mensajes free desde el panel de administracion.
- Anadir metricas de uso del chatbot en el AdminDashboard.
- Considerar rate limiting adicional por usuario/hora para prevenir abuso en plan Pro.
