<?php

namespace App\Http\Controllers;

use App\Models\Step;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Controlador de tareas del tablero tipo Trello de cada paso (step).
 *
 * Qué hace: permite a un usuario autenticado listar, crear, actualizar,
 * mover entre columnas y eliminar las tareas de los pasos de sus propias
 * rutas de aprendizaje.
 *
 * Por qué existe: centraliza la lógica del tablero de progreso (Fase 5),
 * comprobando siempre que el step/task pertenezca a una ruta del usuario
 * autenticado antes de leer o modificar nada.
 *
 * Todas las respuestas siguen la estructura:
 * { success: bool, data: {...}, message: string }
 */
class TaskController extends Controller
{
    /**
     * Valores permitidos para el campo "estado" (columnas del tablero).
     *
     * @var list<string>
     */
    private const ESTADOS = ['pendiente', 'en_progreso', 'completada'];

    /**
     * Comprueba que un step pertenezca a una ruta del usuario autenticado.
     *
     * Por qué existe: evita duplicar esta comprobación en cada método que
     * recibe un Step (index y store).
     *
     * Recibe: el step y el usuario autenticado.
     * Devuelve: true si el step pertenece a una ruta del usuario.
     */
    private function stepPerteneceAlUsuario(Step $step, $usuario): bool
    {
        return $step->route->user_id === $usuario->id;
    }

    /**
     * Comprueba que una task pertenezca (a través de su step y su ruta) al
     * usuario autenticado.
     *
     * Por qué existe: evita duplicar esta comprobación en cada método que
     * recibe una Task (update, destroy y moveColumn).
     *
     * Recibe: la task y el usuario autenticado.
     * Devuelve: true si la task pertenece a una ruta del usuario.
     */
    private function taskPerteneceAlUsuario(Task $task, $usuario): bool
    {
        return $task->step->route->user_id === $usuario->id;
    }

    /**
     * Lista todas las tareas de un paso (step).
     *
     * Qué hace: comprueba que el step pertenezca a una ruta del usuario
     * autenticado y devuelve sus tareas ordenadas por "orden".
     *
     * Por qué existe: alimenta el tablero TrelloBoard del frontend al
     * seleccionar un planeta/step.
     *
     * Recibe: Request autenticado y el step (route model binding).
     * Devuelve: JSON con la lista de tareas (200), o 403 si el step no
     * pertenece a una ruta del usuario.
     */
    public function index(Request $request, Step $step)
    {
        if (! $this->stepPerteneceAlUsuario($step, $request->user())) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para ver las tareas de este paso.',
            ], 403);
        }

        $tareas = $step->tasks()->orderBy('orden')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'tasks' => $tareas,
            ],
            'message' => 'Tareas obtenidas correctamente.',
        ]);
    }

    /**
     * Crea una nueva tarea dentro de un paso (step).
     *
     * Qué hace: valida los datos recibidos, comprueba que el step
     * pertenezca a una ruta del usuario autenticado y crea la tarea. Si no
     * se indica "estado", se crea como "pendiente"; si no se indica
     * "orden", se coloca al final de su columna.
     *
     * Por qué existe: es el botón "+" de cada columna del TrelloBoard.
     *
     * Recibe: Request con "titulo" (obligatorio) y, opcionalmente,
     * "descripcion", "estado", "fecha_limite", "notas" y "orden"; y el step
     * (route model binding).
     * Devuelve: JSON con la tarea creada (201), errores de validación
     * (422), o 403 si el step no pertenece a una ruta del usuario.
     */
    public function store(Request $request, Step $step)
    {
        if (! $this->stepPerteneceAlUsuario($step, $request->user())) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para añadir tareas a este paso.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'titulo' => ['required', 'string'],
            'descripcion' => ['nullable', 'string'],
            'estado' => ['nullable', 'in:' . implode(',', self::ESTADOS)],
            'fecha_limite' => ['nullable', 'date'],
            'notas' => ['nullable', 'string'],
            'orden' => ['nullable', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $estado = $request->input('estado', 'pendiente');

        // Si no se indica "orden", la tarea se coloca al final de su columna.
        $orden = $request->input('orden');
        if ($orden === null) {
            $orden = $step->tasks()->where('estado', $estado)->count();
        }

        $tarea = $step->tasks()->create([
            'titulo' => $request->input('titulo'),
            'descripcion' => $request->input('descripcion'),
            'estado' => $estado,
            'fecha_limite' => $request->input('fecha_limite'),
            'notas' => $request->input('notas'),
            'orden' => $orden,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'task' => $tarea,
            ],
            'message' => 'Tarea creada correctamente.',
        ], 201);
    }

    /**
     * Actualiza los datos de una tarea.
     *
     * Qué hace: valida los datos recibidos, comprueba que la tarea
     * pertenezca a una ruta del usuario autenticado y actualiza los campos
     * indicados (titulo, descripcion, estado, fecha_limite, notas, orden).
     *
     * Por qué existe: es el botón "Guardar" del TaskModal.
     *
     * Recibe: Request con los campos a actualizar (todos opcionales) y la
     * task (route model binding).
     * Devuelve: JSON con la tarea actualizada (200), errores de validación
     * (422), o 403 si la tarea no pertenece a una ruta del usuario.
     */
    public function update(Request $request, Task $task)
    {
        if (! $this->taskPerteneceAlUsuario($task, $request->user())) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para editar esta tarea.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'titulo' => ['sometimes', 'string'],
            'descripcion' => ['sometimes', 'nullable', 'string'],
            'estado' => ['sometimes', 'in:' . implode(',', self::ESTADOS)],
            'fecha_limite' => ['sometimes', 'nullable', 'date'],
            'notas' => ['sometimes', 'nullable', 'string'],
            'orden' => ['sometimes', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $task->update($validator->validated());

        return response()->json([
            'success' => true,
            'data' => [
                'task' => $task,
            ],
            'message' => 'Tarea actualizada correctamente.',
        ]);
    }

    /**
     * Cambia la columna (estado) de una tarea.
     *
     * Qué hace: valida que el nuevo "estado" sea una de las columnas
     * válidas, comprueba que la tarea pertenezca a una ruta del usuario
     * autenticado y actualiza su "estado" (y, si se indica, su "orden"
     * dentro de la nueva columna).
     *
     * Por qué existe: es la acción que dispara el drag and drop del
     * TrelloBoard al soltar una tarjeta en otra columna.
     *
     * Recibe: Request con "estado" (obligatorio) y, opcionalmente, "orden";
     * y la task (route model binding).
     * Devuelve: JSON con la tarea actualizada (200), errores de validación
     * (422), o 403 si la tarea no pertenece a una ruta del usuario.
     */
    public function moveColumn(Request $request, Task $task)
    {
        if (! $this->taskPerteneceAlUsuario($task, $request->user())) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para mover esta tarea.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'estado' => ['required', 'in:' . implode(',', self::ESTADOS)],
            'orden' => ['nullable', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'data' => $validator->errors(),
                'message' => 'Los datos enviados no son válidos.',
            ], 422);
        }

        $datos = ['estado' => $request->input('estado')];

        if ($request->has('orden')) {
            $datos['orden'] = $request->input('orden');
        }

        $task->update($datos);

        return response()->json([
            'success' => true,
            'data' => [
                'task' => $task,
            ],
            'message' => 'Tarea movida correctamente.',
        ]);
    }

    /**
     * Elimina una tarea.
     *
     * Qué hace: comprueba que la tarea pertenezca a una ruta del usuario
     * autenticado y la elimina.
     *
     * Por qué existe: es el botón de eliminar de TaskCard/TaskModal.
     *
     * Recibe: Request autenticado y la task (route model binding).
     * Devuelve: JSON confirmando el borrado (200), o 403 si la tarea no
     * pertenece a una ruta del usuario.
     */
    public function destroy(Request $request, Task $task)
    {
        if (! $this->taskPerteneceAlUsuario($task, $request->user())) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No tienes permiso para eliminar esta tarea.',
            ], 403);
        }

        $task->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Tarea eliminada correctamente.',
        ]);
    }
}
