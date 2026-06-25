<?php

namespace App\Http\Controllers;

use App\Models\Route;
use App\Services\GeminiService;
use App\Services\PlanificadorFechasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Controlador de rutas de aprendizaje generadas con IA.
 *
 * Qué hace: permite a un usuario autenticado generar nuevas rutas de
 * aprendizaje (usando GeminiService), listar las suyas, ver el detalle de
 * una y eliminarla.
 *
 * Por qué existe: centraliza la lógica del "generador de rutas con IA",
 * incluyendo el límite de rutas del plan free.
 *
 * Todas las respuestas siguen la estructura:
 * { success: bool, data: {...}, message: string }
 */
class RouteController extends Controller
{
    /**
     * Número máximo de rutas que puede generar un usuario del plan free.
     */
    private const LIMITE_RUTAS_PLAN_FREE = 2;

    /**
     * Lista las rutas del usuario autenticado.
     *
     * Qué hace: devuelve todas las rutas creadas por el usuario, cada una
     * con sus pasos (steps), ordenadas de la más reciente a la más antigua.
     *
     * Por qué existe: alimenta el Dashboard del frontend, donde se muestran
     * las rutas ya generadas por el usuario.
     *
     * Recibe: Request autenticado (middleware auth:sanctum).
     * Devuelve: JSON con la lista de rutas y sus pasos (200), cada paso con
     * su porcentaje de progreso ("progreso") calculado a partir de sus tasks.
     */
    public function index(Request $request)
    {
        // Con ?archivadas=true devuelve solo las archivadas; por defecto,
        // solo las activas (archivada = false).
        $soloArchivadas = $request->boolean('archivadas', false);

        // Excluir rutas en estado 'error' (nunca deberían mostrarse al usuario;
        // son restos de generaciones fallidas del flujo antiguo).
        $rutas = $request->user()
            ->routes()
            ->with('steps.tasks')
            ->where('archivada', $soloArchivadas)
            ->where('estado', '!=', 'error')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'routes' => $rutas,
            ],
            'message' => 'Rutas obtenidas correctamente.',
        ]);
    }

    /**
     * Genera una nueva ruta de aprendizaje con IA.
     *
     * Flujo (Gemini primero, BD después):
     *   1. Validar inputs.
     *   2. Comprobar límite del plan free (excluyendo rutas con error o archivadas).
     *   3. Llamar a Gemini ANTES de tocar la BD.
     *   4. Si Gemini falla → devolver 502 sin crear ningún registro.
     *   5. Solo si Gemini responde correctamente → crear ruta + steps + tasks.
     *
     * Este orden evita que los errores de Gemini (timeout, 429, 503, etc.)
     * consuman el cupo de rutas del plan free del usuario.
     *
     * Recibe: Request con "destino", "punto_partida" y "fecha_inicio" (opcional).
     * Devuelve: JSON con la ruta generada (201), errores de validación (422),
     * límite alcanzado (403) o error de Gemini (502).
     */
    public function generate(Request $request, GeminiService $geminiService, PlanificadorFechasService $planificador)
    {
        $hoy = now()->toDateString();

        $validator = Validator::make($request->all(), [
            'destino'       => ['required', 'string', 'max:1000'],
            'punto_partida' => ['required', 'string', 'max:2000'],
            'fecha_inicio'  => ['nullable', 'date', 'date_format:Y-m-d', 'after_or_equal:' . $hoy],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $usuario = $request->user();

        // Conteo del plan free: solo cuentan rutas que NO están en error
        // y NO están archivadas. Las rutas fallidas o archivadas no deben
        // penalizar al usuario.
        $rutasActivas = $usuario->routes()
            ->where('estado', '!=', 'error')
            ->where('archivada', false)
            ->count();

        if ($usuario->plan === 'free' && $rutasActivas >= self::LIMITE_RUTAS_PLAN_FREE) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Has alcanzado el límite de ' . self::LIMITE_RUTAS_PLAN_FREE . ' rutas del plan free.',
            ], 403);
        }

        $destino      = $request->input('destino');
        $puntoPartida = $request->input('punto_partida');
        $fechaInicio  = $request->input('fecha_inicio', $hoy);

        // --- PASO 1: Llamar a Gemini ANTES de crear nada en la BD ---
        // Si falla (timeout, error HTTP, respuesta inválida), devolvemos
        // error 502 sin haber escrito en la BD → no consume cupo.
        try {
            $resultado = $geminiService->generarRuta($destino, $puntoPartida);
        } catch (\Throwable $e) {
            // SEGURIDAD: registrar el error real en el log del servidor pero
            // devolver un mensaje genérico al usuario (sin detalles internos).
            Log::error('Error generando ruta con Gemini', [
                'user_id' => $usuario->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No se ha podido generar la ruta. Inténtalo de nuevo en unos minutos.',
            ], 502);
        }

        // --- PASO 2: Gemini respondió correctamente → crear todo en BD ---
        $ruta = Route::create([
            'user_id'                => $usuario->id,
            'titulo'                 => $resultado['titulo'],
            'destino'                => $destino,
            'punto_partida'          => $puntoPartida,
            'destino_espacial'       => $resultado['destino_espacial'],
            'dificultad'             => $resultado['dificultad'],
            'tiempo_estimado_semanas' => $resultado['tiempo_estimado_semanas'],
            'estado'                 => 'completada',
            'fecha_inicio'           => $fechaInicio,
        ]);

        // Calcular fechas_limite para todas las tareas de forma determinística
        // usando la fecha_inicio de la ruta y tiempo_estimado_semanas de cada step.
        $pasos = $planificador->planificarFechas($ruta, $resultado['steps']);

        $stepsCreados = $ruta->steps()->createMany(array_map(function (array $paso) {
            return [
                'orden'                  => $paso['orden'],
                'titulo'                 => $paso['titulo'],
                'descripcion'            => $paso['descripcion'],
                'proyecto_aprendizaje'   => $paso['proyecto_aprendizaje'],
                'tiempo_estimado_semanas' => $paso['tiempo_estimado_semanas'],
            ];
        }, $pasos));

        foreach ($stepsCreados as $indice => $step) {
            $tareas = $pasos[$indice]['tareas'] ?? null;

            if (!is_array($tareas)) {
                continue;
            }

            $tareasValidas = array_values(array_filter(
                $tareas,
                fn (array $tarea) => !empty($tarea['titulo'])
            ));

            $step->tasks()->createMany(array_map(function (array $tarea, int $orden) {
                return [
                    'titulo'       => $tarea['titulo'],
                    'descripcion'  => $tarea['descripcion'] ?? null,
                    'estado'       => 'pendiente',
                    'orden'        => $orden,
                    'fecha_limite' => $tarea['fecha_limite'] ?? null,
                ];
            }, $tareasValidas, array_keys($tareasValidas)));
        }

        return response()->json([
            'success' => true,
            'data' => [
                'route' => $ruta->load('steps.tasks'),
            ],
            'message' => 'Ruta generada correctamente.',
        ], 201);
    }

    /**
     * Muestra el detalle de una ruta, con sus pasos.
     *
     * Qué hace: comprueba que la ruta pertenezca al usuario autenticado y
     * devuelve la ruta junto con todos sus pasos.
     *
     * Por qué existe: permite ver el detalle completo de una ruta generada.
     *
     * Recibe: Request autenticado y la ruta (route model binding).
     * Devuelve: JSON con la ruta y sus pasos (200), cada paso con su
     * porcentaje de progreso ("progreso") calculado a partir de sus tasks,
     * o 403 si la ruta no pertenece al usuario.
     */
    public function show(Request $request, Route $route)
    {
        if ($route->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para ver esta ruta.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'route' => $route->load('steps.tasks'),
            ],
            'message' => 'Ruta obtenida correctamente.',
        ]);
    }

    /**
     * Archiva una ruta del usuario autenticado.
     *
     * Qué hace: marca la ruta como archivada (archivada = true,
     * archivada_en = ahora). Las rutas archivadas se ocultan del Dashboard
     * principal y se muestran en la sección "Rutas archivadas". Si no se
     * restauran en 15 días, el comando Artisan las elimina automáticamente.
     *
     * Recibe: Request autenticado y la ruta (route model binding).
     * Devuelve: JSON con la ruta actualizada (200), o 403 si no pertenece al usuario.
     */
    public function archive(Request $request, Route $route)
    {
        if ($route->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para archivar esta ruta.',
            ], 403);
        }

        $route->update([
            'archivada'    => true,
            'archivada_en' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => ['route' => $route],
            'message' => 'Ruta archivada correctamente.',
        ]);
    }

    /**
     * Restaura una ruta archivada del usuario autenticado.
     *
     * Qué hace: desmarca la ruta como archivada (archivada = false,
     * archivada_en = null) para que vuelva a aparecer en el Dashboard.
     *
     * Recibe: Request autenticado y la ruta (route model binding).
     * Devuelve: JSON con la ruta actualizada (200), o 403 si no pertenece al usuario.
     */
    public function unarchive(Request $request, Route $route)
    {
        if ($route->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para restaurar esta ruta.',
            ], 403);
        }

        $route->update([
            'archivada'    => false,
            'archivada_en' => null,
        ]);

        return response()->json([
            'success' => true,
            'data' => ['route' => $route],
            'message' => 'Ruta restaurada correctamente.',
        ]);
    }

    /**
     * Elimina una ruta del usuario autenticado.
     *
     * Qué hace: comprueba que la ruta pertenezca al usuario autenticado y
     * la elimina (sus pasos se eliminan en cascada por la clave foránea).
     *
     * Por qué existe: permite al usuario borrar rutas generadas que ya no
     * le interesen, liberando hueco dentro del límite de su plan.
     *
     * Recibe: Request autenticado y la ruta (route model binding).
     * Devuelve: JSON confirmando el borrado (200), o 403 si la ruta no
     * pertenece al usuario.
     */
    public function destroy(Request $request, Route $route)
    {
        if ($route->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para eliminar esta ruta.',
            ], 403);
        }

        $route->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Ruta eliminada correctamente.',
        ]);
    }
}
