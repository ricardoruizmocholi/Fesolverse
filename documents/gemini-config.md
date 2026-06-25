# Configuración de Gemini API

## Modelo actual

**gemini-2.0-flash-lite** — el modelo más rápido y ligero de Google.

- Tiempo de respuesta típico: 3-8 segundos
- Consumo de tokens: significativamente menor que gemini-2.5-flash
- URL del endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent`

### Por qué se eligió

1. **Velocidad**: IONOS (hosting de producción) corta las conexiones HTTP después de ~30s. Con gemini-2.5-flash las respuestas tardaban 15-40s, causando timeouts frecuentes. Con 2.0-flash-lite se resuelve en 3-8s.
2. **Coste**: menos tokens consumidos = más margen en el tier gratuito.
3. **Calidad suficiente**: para generar rutas de aprendizaje en formato JSON estructurado, el modelo lite produce resultados equivalentes al modelo más grande.

## Timeout

- **25 segundos** (constante `TIMEOUT_SEGUNDOS` en `GeminiService.php`)
- Elegido para fallar antes de que IONOS corte la conexión (~30s), dejando margen para la respuesta HTTP al frontend.

## Límites del tier gratuito de Gemini

| Límite | Valor (junio 2026) |
|---|---|
| Peticiones por minuto (RPM) | 30 |
| Peticiones por día (RPD) | 1500 |
| Tokens por minuto | 1.000.000 |

Si se alcanzan estos límites, Gemini devuelve HTTP 429. El error se registra en `storage/logs/laravel.log` y el usuario ve un mensaje genérico ("Inténtalo de nuevo en unos minutos").

## Clave API

- Se lee de la variable de entorno `GEMINI_API_KEY` (archivo `.env`)
- Se accede vía `config('services.gemini.key')` (definido en `config/services.php`)
- **Nunca se expone al frontend**: la clave se usa solo en peticiones server-to-server desde `GeminiService.php`

## Cómo cambiar de modelo

1. Editar la constante `API_URL` en `backend/app/Services/GeminiService.php`
2. Reemplazar `gemini-2.0-flash-lite` por el nuevo modelo (ej: `gemini-2.0-flash`, `gemini-1.5-pro`)
3. Ajustar `TIMEOUT_SEGUNDOS` si el nuevo modelo es más lento
4. Probar con `php artisan tinker`:
   ```php
   app(App\Services\GeminiService::class)->generarRuta('Aprender React', 'Sé HTML y CSS');
   ```
5. Verificar que el JSON devuelto sigue la estructura esperada (titulo, steps, tareas)

## Archivos relevantes

- `backend/app/Services/GeminiService.php` — comunicación con la API
- `backend/config/services.php` — lectura de `GEMINI_API_KEY`
- `backend/.env` — clave API (no commitear)
