# Flujo de generación de rutas

## Flujo actual (paso a paso)

```
Usuario                Frontend               Backend                 Gemini API
  |                      |                      |                       |
  |-- Click "Generar" -->|                      |                       |
  |                      |-- POST /generate --->|                       |
  |                      |                      |-- Validar inputs      |
  |                      |                      |-- Comprobar límite    |
  |                      |                      |   plan free           |
  |                      |                      |-- generarRuta() ----->|
  |                      |   (espera 3-25s)     |   (timeout 25s)      |
  |                      |                      |<-- JSON ruta ---------|
  |                      |                      |-- Crear Route en BD   |
  |                      |                      |-- PlanificadorFechas  |
  |                      |                      |-- Crear Steps en BD   |
  |                      |                      |-- Crear Tasks en BD   |
  |                      |<-- 201 + ruta -------|                       |
  |<-- Mostrar ruta -----|                      |                       |
```

### Detalle del flujo backend (`RouteController@generate`)

1. **Validar inputs**: `destino` (max 1000), `punto_partida` (max 2000), `fecha_inicio` (opcional, >= hoy)
2. **Comprobar límite del plan free**: contar rutas del usuario WHERE `estado != 'error' AND archivada = false`. Si plan = free y count >= 2 → 403
3. **Llamar a Gemini**: `GeminiService::generarRuta($destino, $puntoPartida)` → si falla → 502 (sin tocar BD)
4. **Crear la ruta**: `Route::create(...)` con estado `completada` directamente (datos de Gemini)
5. **Planificar fechas**: `PlanificadorFechasService::planificarFechas($ruta, $steps)` calcula fecha_limite para cada tarea
6. **Crear steps**: `$ruta->steps()->createMany(...)` con orden, titulo, descripcion, etc.
7. **Crear tasks**: por cada step, crear sus tareas con titulo, descripcion, estado=pendiente, fecha_limite
8. **Devolver 201**: la ruta completa con `steps.tasks` cargados

## Cambio clave: Gemini primero, BD después

### Antes (problemático)

```
1. Crear ruta en BD (estado='generando') ← ya consume cupo del plan
2. Llamar a Gemini
3. Si falla → ruta queda en estado='error' (cupo ya consumido)
```

**Problema**: un timeout de Gemini, un error 429 (rate limit) o un 503 (servicio no disponible) dejaba una ruta "fantasma" en estado error que contaba contra el límite del plan free. El usuario perdía una de sus 2 rutas gratuitas sin obtener nada a cambio.

### Después (actual)

```
1. Llamar a Gemini PRIMERO (sin tocar BD)
2. Si falla → devolver 502, BD intacta, cupo intacto
3. Solo si éxito → crear todo en BD con estado='completada'
```

**Beneficio**: los errores de Gemini nunca consumen cupo. La ruta solo existe en BD si la generación fue exitosa.

## Límite del plan free

- **Constante**: `LIMITE_RUTAS_PLAN_FREE = 2`
- **Conteo**: `WHERE estado != 'error' AND archivada = false`
- Las rutas archivadas y las que quedaron en error (del flujo antiguo) no cuentan
- Los usuarios pro no tienen límite
- Al eliminar o archivar una ruta, el cupo se libera

## Casos de error

| Error | Código HTTP | ¿Consume cupo? | Mensaje al usuario |
|---|---|---|---|
| Input inválido | 422 | No | "Los datos enviados no son válidos." |
| Límite plan free | 403 | No | "Has alcanzado el límite de 2 rutas del plan free." |
| Gemini timeout | 502 | **No** | "No se ha podido generar la ruta. Inténtalo de nuevo en unos minutos." |
| Gemini error HTTP (429, 503...) | 502 | **No** | Mismo mensaje genérico |
| Gemini respuesta inválida | 502 | **No** | Mismo mensaje genérico |
| API key no configurada | 502 | **No** | Mismo mensaje genérico |

Los detalles del error se registran en `storage/logs/laravel.log` con `Log::error()`.

## Archivos relevantes

- `backend/app/Http/Controllers/RouteController.php` — flujo de generación
- `backend/app/Services/GeminiService.php` — comunicación con Gemini API
- `backend/app/Services/PlanificadorFechasService.php` — cálculo de fechas_limite
- `documents/gemini-config.md` — configuración del modelo y timeout
