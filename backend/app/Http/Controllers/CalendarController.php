<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Controlador del calendario centralizado.
 *
 * Qué hace: expone TODAS las tasks del usuario (de todas sus rutas) en una
 * sola consulta con filtrado opcional por rango de fecha_limite, y permite
 * actualizar la fecha_limite de una task individual (acción disparada por el
 * drag and drop de la vista semanal del calendario).
 *
 * Por qué existe: el Dashboard muestra las tareas por ruta/step de forma
 * aislada. Esta vista global es necesaria para la página de Calendario donde
 * el usuario ve y reorganiza las tareas de todas sus rutas en un solo lugar.
 *
 * Todas las respuestas siguen la estructura:
 * { success: bool, data: {...}, message: string }
 */
class CalendarController extends Controller
{
    /**
     * Devuelve todas las tasks del usuario autenticado de todas sus rutas.
     *
     * Qué hace: consulta todas las tasks cuyo step pertenece a una ruta del
     * usuario autenticado. Acepta los parámetros opcionales ?desde y ?hasta
     * para filtrar por rango de fecha_limite (útil si en el futuro se necesita
     * paginar por periodos muy amplios). Incluye el step y la route de cada
     * task para que el frontend pueda mostrar el contexto (de qué ruta y paso
     * viene cada tarea). Las tasks con fecha se devuelven ordenadas por
     * fecha_limite; las tasks sin fecha al final.
     *
     * Recibe: Request con ?desde=YYYY-MM-DD y/o ?hasta=YYYY-MM-DD (opcionales).
     * Devuelve: JSON con la lista de tasks formateadas (200).
     */
    public function tasks(Request $request): JsonResponse
    {
        $query = Task::whereHas('step.route', fn ($q) => $q->where('user_id', $request->user()->id))
            ->with([
                // Cargamos solo las columnas necesarias para reducir el payload.
                // route_id es obligatorio para que Eloquent pueda resolver
                // la relación step.route en la consulta anidada.
                'step:id,titulo,orden,route_id',
                'step.route:id,titulo,destino_espacial',
            ]);

        // Filtro opcional por rango de fecha_limite.
        if ($request->filled('desde')) {
            $query->where('fecha_limite', '>=', $request->input('desde'));
        }

        if ($request->filled('hasta')) {
            $query->where('fecha_limite', '<=', $request->input('hasta'));
        }

        // Tasks con fecha_limite ordenadas primero, luego sin fecha, y
        // dentro de cada grupo ordenadas por id para estabilidad.
        $tasks = $query
            ->orderByRaw('fecha_limite IS NULL')
            ->orderBy('fecha_limite')
            ->orderBy('id')
            ->get()
            ->map(fn ($task) => $this->formatearTask($task));

        return response()->json([
            'success' => true,
            'data'    => ['tasks' => $tasks],
            'message' => 'Tareas obtenidas correctamente.',
        ]);
    }

    /**
     * Actualiza solo la fecha_limite de una task.
     *
     * Qué hace: comprueba que la task pertenezca a una ruta del usuario
     * autenticado, valida que la nueva fecha sea válida o null, y actualiza
     * el campo. Este endpoint lo usa el drag and drop de la vista semanal:
     * al soltar una tarjeta en otro día se envía la nueva fecha; al soltarla
     * en la columna "Sin fecha" se envía null.
     *
     * Recibe: Request con "fecha_limite" (nullable, date) y la task (route
     * model binding).
     * Devuelve: JSON con la task actualizada (200), 403 si la task no
     * pertenece al usuario, o 422 si la fecha no es válida.
     */
    public function updateFecha(Request $request, Task $task): JsonResponse
    {
        // Verificar ownership: la task debe pertenecer a una ruta del usuario.
        if ($task->step->route->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'data'    => [],
                'message' => 'No tienes permiso para editar esta tarea.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'fecha_limite' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data'    => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $task->update(['fecha_limite' => $request->input('fecha_limite')]);

        // Recargar relaciones para incluirlas en la respuesta formateada.
        $task->load(['step:id,titulo,orden,route_id', 'step.route:id,titulo,destino_espacial']);

        return response()->json([
            'success' => true,
            'data'    => ['task' => $this->formatearTask($task)],
            'message' => 'Fecha límite actualizada correctamente.',
        ]);
    }

    /**
     * Formatea una task con su step y route para la respuesta de la API.
     *
     * Qué hace: aplana la jerarquía task→step→route en un array plano con
     * las claves "step" y "route" al mismo nivel, en lugar de anidadas. Así
     * el frontend puede acceder a task.route.titulo directamente.
     *
     * Recibe: una instancia de Task con las relaciones step y step.route
     * ya cargadas.
     * Devuelve: array asociativo con los campos de la task más step y route.
     */
    private function formatearTask(Task $task): array
    {
        return [
            'id'           => $task->id,
            'titulo'       => $task->titulo,
            'descripcion'  => $task->descripcion,
            'estado'       => $task->estado,
            'fecha_limite' => $task->fecha_limite,
            'notas'        => $task->notas,
            'orden'        => $task->orden,
            'step'         => [
                'id'     => $task->step->id,
                'titulo' => $task->step->titulo,
                'orden'  => $task->step->orden,
            ],
            'route'        => [
                'id'               => $task->step->route->id,
                'titulo'           => $task->step->route->titulo,
                'destino_espacial' => $task->step->route->destino_espacial,
            ],
        ];
    }
}
