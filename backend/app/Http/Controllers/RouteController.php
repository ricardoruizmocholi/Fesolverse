<?php

namespace App\Http\Controllers;

use App\Models\Route;
use App\Services\GeminiService;
use Illuminate\Http\Request;
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
        $rutas = $request->user()
            ->routes()
            ->with('steps.tasks')
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
     * Qué hace: valida el destino y el punto de partida indicados por el
     * usuario, comprueba que no haya superado el límite de rutas de su
     * plan, crea la ruta en estado "generando", llama a GeminiService para
     * obtener la ruta generada y, según el resultado, actualiza la ruta a
     * "completada" (con sus pasos y, para cada paso, sus tareas iniciales
     * en estado "pendiente") o a "error".
     *
     * Por qué existe: es el punto de entrada del "generador de rutas con
     * IA" desde el frontend.
     *
     * Recibe: Request con "destino" y "punto_partida".
     * Devuelve: JSON con la ruta generada y sus pasos (201), errores de
     * validación (422), límite del plan alcanzado (403) o error al generar
     * la ruta con la IA (502).
     */
    public function generate(Request $request, GeminiService $geminiService)
    {
        $validator = Validator::make($request->all(), [
            'destino' => ['required', 'string'],
            'punto_partida' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $usuario = $request->user();

        if ($usuario->plan === 'free' && $usuario->routes()->count() >= self::LIMITE_RUTAS_PLAN_FREE) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Has alcanzado el límite de ' . self::LIMITE_RUTAS_PLAN_FREE . ' rutas del plan free.',
            ], 403);
        }

        $destino = $request->input('destino');
        $puntoPartida = $request->input('punto_partida');

        // Creamos la ruta en estado "generando" con valores provisionales
        // que se sobrescribirán cuando la IA devuelva el resultado.
        $ruta = Route::create([
            'user_id' => $usuario->id,
            'titulo' => 'Generando ruta...',
            'destino' => $destino,
            'punto_partida' => $puntoPartida,
            'destino_espacial' => 'La Luna',
            'dificultad' => 'moderado',
            'tiempo_estimado_semanas' => 0,
            'estado' => 'generando',
        ]);

        try {
            $resultado = $geminiService->generarRuta($destino, $puntoPartida);

            $ruta->update([
                'titulo' => $resultado['titulo'],
                'destino_espacial' => $resultado['destino_espacial'],
                'dificultad' => $resultado['dificultad'],
                'tiempo_estimado_semanas' => $resultado['tiempo_estimado_semanas'],
                'estado' => 'completada',
            ]);

            $pasos = $resultado['steps'];

            $stepsCreados = $ruta->steps()->createMany(array_map(function (array $paso) {
                return [
                    'orden' => $paso['orden'],
                    'titulo' => $paso['titulo'],
                    'descripcion' => $paso['descripcion'],
                    'proyecto_aprendizaje' => $paso['proyecto_aprendizaje'],
                    'tiempo_estimado_semanas' => $paso['tiempo_estimado_semanas'],
                ];
            }, $pasos));

            // Por cada step creamos sus tareas iniciales a partir del array
            // "tareas" devuelto por Gemini (si un step no lo trae, o no es
            // un array, simplemente no se le crea ninguna tarea).
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
                        'titulo' => $tarea['titulo'],
                        'descripcion' => $tarea['descripcion'] ?? null,
                        'estado' => 'pendiente',
                        'orden' => $orden,
                    ];
                }, $tareasValidas, array_keys($tareasValidas)));
            }
        } catch (\Throwable $e) {
            $ruta->update(['estado' => 'error']);

            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No se ha podido generar la ruta: ' . $e->getMessage(),
            ], 502);
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
