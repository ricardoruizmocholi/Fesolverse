# Seguridad de Fesolverse

Última auditoría: junio 2026

## Vulnerabilidades encontradas y corregidas

### 1. Filtración de detalles internos de Gemini al usuario (CORREGIDA)

**Riesgo**: Alto
**Archivo**: `GeminiService.php` + `RouteController.php`

**Problema**: cuando Gemini devolvía un error HTTP, el body de la respuesta (que puede contener la API key reflejada, detalles internos de Google o trazas de error) se incluía en el mensaje de excepción y se devolvía al frontend tal cual:

```php
// ANTES (inseguro):
throw new Exception('Error: ' . $response->body());
// Y en el controller:
'message' => 'No se ha podido generar la ruta: ' . $e->getMessage(),
```

**Corrección**: los errores se registran en `storage/logs/laravel.log` con `Log::error()` pero el mensaje devuelto al usuario es genérico y no contiene detalles internos.

### 2. Rutas de proyectos sin autenticación (PENDIENTE)

**Riesgo**: Medio
**Archivo**: `routes/api.php` línea 20

**Problema**: `Route::apiResource('projects', ProjectController::class)` está fuera del grupo `auth:sanctum`, permitiendo CRUD público sin autenticación. Es un controlador legacy del scaffold inicial.

**Recomendación**: mover dentro del grupo `auth:sanctum` o eliminar si ya no se usa. No se corrigió en esta sesión para no romper funcionalidad existente.

### 3. Inputs de usuario sin límite de longitud (CORREGIDA)

**Riesgo**: Bajo
**Archivo**: `RouteController.php`

**Problema**: los campos `destino` y `punto_partida` se validaban como `required|string` sin límite de longitud. Un usuario podría enviar textos de cientos de KB, consumiendo tokens de Gemini y ancho de banda.

**Corrección**: añadidos `max:1000` para destino y `max:2000` para punto_partida.

## Estado actual de seguridad por endpoint

### Endpoints públicos (sin auth)

| Endpoint | Estado | Notas |
|---|---|---|
| `POST /register` | OK | Validación completa, password hasheado |
| `POST /login` | OK | Rate limiting por IP (`login.throttle`) |
| `GET /email/verify/{id}/{hash}` | OK | Middleware `signed` |
| `POST /forgot-password` | OK | Mensaje genérico (no revela si el email existe) |
| `POST /reset-password` | OK | Token temporal con expiración |
| `GET /status` | OK | Solo devuelve estado del servicio |
| `apiResource projects` | **PENDIENTE** | Sin autenticación — mover a auth:sanctum |

### Endpoints autenticados (auth:sanctum)

| Endpoint | Ownership check | Validación |
|---|---|---|
| `GET /routes` | Implícito (filtra por user_id) | OK |
| `POST /routes/generate` | Implícito (crea con user_id del auth) | OK + max length |
| `GET /routes/{route}` | Explícito (user_id check) | OK |
| `DELETE /routes/{route}` | Explícito (user_id check) | OK |
| `POST /routes/{route}/archive` | Explícito (user_id check) | OK |
| `POST /routes/{route}/unarchive` | Explícito (user_id check) | OK |
| `GET /steps/{step}/tasks` | Explícito (step→route→user_id) | OK |
| `POST /steps/{step}/tasks` | Explícito (step→route→user_id) | OK |
| `PUT /tasks/{task}` | Explícito (task→step→route→user_id) | OK |
| `PATCH /tasks/{task}/move` | Explícito (task→step→route→user_id) | OK |
| `DELETE /tasks/{task}` | Explícito (task→step→route→user_id) | OK |
| `GET /calendar/tasks` | Implícito (whereHas user_id) | OK |
| `PATCH /tasks/{task}/fecha` | Explícito (task→step→route→user_id) | OK |
| `PUT /profile` | Implícito (auth user) | OK |
| `PUT /profile/password` | Implícito + Hash::check | OK |

### Endpoints admin (auth:sanctum + admin middleware)

Todos los endpoints bajo `/admin/` requieren el middleware `IsAdmin` además de `auth:sanctum`. Verificado: ningún endpoint admin permite acceso a usuarios no-admin.

## Buenas prácticas implementadas

1. **Contraseñas**: hasheadas con bcrypt (`Hash::make` + cast `hashed`)
2. **Tokens Sanctum**: tokens de API con revocación individual en logout
3. **CORS**: configurado en `config/cors.php` para permitir solo el origen del frontend
4. **Rate limiting**: login protegido contra fuerza bruta (`login.throttle`)
5. **Verificación de email**: enlace firmado con expiración (`middleware('signed')`)
6. **Ownership checks**: todos los endpoints de usuario verifican que el recurso pertenece al usuario autenticado antes de leer/modificar
7. **SQL injection**: no hay consultas raw; todo usa Eloquent ORM con bindings paramétricos
8. **Errores internos**: los detalles de errores de APIs externas (Gemini, Stripe) se registran en el log pero NO se exponen al usuario
9. **API keys**: `GEMINI_API_KEY` y `STRIPE_SECRET_KEY` se leen de `.env` vía `config()`, nunca aparecen en respuestas JSON

## Pendientes para futuras sesiones

- [ ] Mover `apiResource('projects')` dentro de `auth:sanctum` o eliminar
- [ ] Añadir rate limiting a `POST /routes/generate` (evitar abuso del generador de IA)
- [ ] Añadir rate limiting a `POST /forgot-password` (evitar email bombing)
- [ ] Implementar CSRF para las rutas Sanctum si se usa cookie-based auth
- [ ] Añadir Content Security Policy headers
- [ ] Revisar que `.env` está en `.gitignore` (no commitear claves)
- [ ] Considerar límite de longitud en campos de tareas (titulo, descripcion, notas)
