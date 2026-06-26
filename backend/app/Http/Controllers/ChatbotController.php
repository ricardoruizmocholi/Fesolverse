<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ChatbotController extends Controller
{
    private const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    private const TIMEOUT_SEGUNDOS = 125;
    private const LIMITE_MENSAJES_FREE = 5;

    public function message(Request $request, Task $task)
    {
        $usuario = $request->user();

        $step = $task->step;
        $route = $step->route;

        if ($route->user_id !== $usuario->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para acceder a esta tarea.',
            ], 403);
        }

        if ($usuario->plan === 'free' && $route->chatbot_mensajes_usados >= self::LIMITE_MENSAJES_FREE) {
            return response()->json([
                'success' => false,
                'message' => 'Has alcanzado el limite de mensajes del chatbot para esta ruta. Actualiza a Pro para mensajes ilimitados.',
                'chatbot_mensajes_usados' => $route->chatbot_mensajes_usados,
            ], 403);
        }

        $validador = Validator::make($request->all(), [
            'mensaje' => 'required|string|max:1000',
        ]);

        if ($validador->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validador->errors()->first(),
            ], 422);
        }

        $mensajeUsuario = $request->input('mensaje');

        $prompt = $this->construirPrompt($task, $step, $route, $mensajeUsuario);

        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            Log::error('Chatbot: clave de API de Gemini no configurada.');
            return response()->json([
                'success' => false,
                'message' => 'El servicio de asistencia no esta disponible en este momento.',
            ], 502);
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SEGUNDOS)->post(self::API_URL . '?key=' . $apiKey, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Chatbot: error de conexion con Gemini', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'No se ha podido contactar con el asistente. Intentalo de nuevo.',
            ], 502);
        }

        if (!$response->successful()) {
            Log::error('Chatbot: respuesta HTTP no exitosa de Gemini', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'El asistente no ha podido procesar tu pregunta.',
            ], 502);
        }

        $datos = $response->json();
        $respuestaTexto = $datos['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (!$respuestaTexto) {
            return response()->json([
                'success' => false,
                'message' => 'El asistente no ha generado una respuesta valida.',
            ], 502);
        }

        $route->increment('chatbot_mensajes_usados');

        return response()->json([
            'success' => true,
            'data' => [
                'respuesta' => $respuestaTexto,
                'chatbot_mensajes_usados' => $route->chatbot_mensajes_usados,
            ],
        ]);
    }

    private function construirPrompt(Task $task, $step, $route, string $mensajeUsuario): string
    {
        return <<<PROMPT
Eres un mentor experto que ayuda al usuario a completar tareas de aprendizaje. Responde de forma clara, practica y concisa en espanol.

CONTEXTO DE LA RUTA DE APRENDIZAJE:
- Ruta: {$route->titulo}
- Destino: {$route->destino}

CONTEXTO DEL PASO ACTUAL:
- Paso: {$step->titulo}
- Descripcion del paso: {$step->descripcion}
- Proyecto de aprendizaje: {$step->proyecto_aprendizaje}

CONTEXTO DE LA TAREA:
- Tarea: {$task->titulo}
- Descripcion: {$task->descripcion}
- Notas del usuario: {$task->notas}
- Estado actual: {$task->estado}

PREGUNTA DEL USUARIO:
{$mensajeUsuario}

Responde directamente a la pregunta del usuario teniendo en cuenta todo el contexto anterior. Si la pregunta no tiene relacion con la tarea o el aprendizaje, indica amablemente que solo puedes ayudar con temas relacionados con la tarea.
PROMPT;
    }
}
