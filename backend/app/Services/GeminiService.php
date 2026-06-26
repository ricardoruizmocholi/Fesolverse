<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    /**
     * URL del endpoint de generación de contenido de Gemini.
     *
     * Se usa gemini-2.5-flash: el modelo más rápido y ligero de Google.
     * Responde en 3-8 segundos y consume menos tokens que 2.5-flash,
     * compatible con el timeout de 25s para evitar cortes de IONOS.
     */
    private const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    /**
     * Timeout de la petición HTTP a Gemini (en segundos).
     * Fijado a 25s para fallar antes de que IONOS corte la conexión (~30s).
     */
    private const TIMEOUT_SEGUNDOS = 25;

    /**
     * Genera una ruta de aprendizaje personalizada con la IA de Gemini.
     *
     * Qué hace: construye un prompt a partir del destino y el punto de
     * partida indicados por el usuario, lo envía a la API de Gemini y
     * devuelve la ruta generada (título, dificultad, destino espacial,
     * semanas estimadas y pasos, cada uno con sus tareas básicas) como un
     * array asociativo PHP.
     *
     * Por qué existe: centraliza toda la comunicación con la IA para que
     * el controlador no tenga que conocer el prompt ni el formato exacto
     * de la respuesta de Gemini.
     *
     * Recibe: $destino (a dónde quiere llegar el usuario) y $puntoPartida
     * (de dónde parte / qué conocimientos o recursos tiene ya).
     * Devuelve: array asociativo con la estructura de la ruta generada.
     *
     * @throws Exception si falta la API key, la petición falla (timeout,
     *                    error HTTP) o la respuesta no contiene un JSON válido.
     */
    public function generarRuta(string $destino, string $puntoPartida): array
    {
        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            throw new Exception('La clave de la API de Gemini no está configurada (GEMINI_API_KEY).');
        }

        $prompt = $this->construirPrompt($destino, $puntoPartida);

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
            // SEGURIDAD: registrar el error internamente sin exponer detalles
            // al usuario (podría contener la API key o datos de la petición).
            Log::error('Gemini: error de conexión', ['error' => $e->getMessage()]);
            throw new Exception('Error de conexión con la API de Gemini.');
        }

        if ($response->failed()) {
            // SEGURIDAD: el body de error de Gemini puede contener la API key
            // reflejada o detalles internos. Se registra en el log del servidor
            // pero NUNCA se devuelve al usuario.
            Log::error('Gemini: error HTTP', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new Exception('La API de Gemini respondió con un error HTTP ' . $response->status() . '.');
        }

        $texto = $response->json('candidates.0.content.parts.0.text');

        if (empty($texto)) {
            throw new Exception('La API de Gemini no devolvió ningún contenido.');
        }

        return $this->extraerJson($texto);
    }

    /**
     * Construye el prompt que se envía a Gemini.
     *
     * Qué hace: traduce el destino y el punto de partida del usuario en
     * instrucciones para que la IA genere una ruta de aprendizaje con
     * pasos concretos, indicando el mapeo de dificultad a "destino
     * espacial" y el formato JSON exacto que debe devolver la respuesta.
     *
     * Recibe: $destino, $puntoPartida.
     * Devuelve: el prompt completo en texto plano.
     */
    private function construirPrompt(string $destino, string $puntoPartida): string
    {
        return <<<PROMPT
Eres un mentor experto en diseñar rutas de aprendizaje personalizadas.

Un usuario quiere alcanzar el siguiente destino (objetivo de aprendizaje o profesional):
"{$destino}"

Su punto de partida actual (conocimientos, experiencia o recursos con los que ya cuenta) es:
"{$puntoPartida}"

Genera una ruta de aprendizaje personalizada, dividida en pasos (steps) ordenados, que lleve al usuario desde su punto de partida hasta su destino.

Para cada ruta debes asignar una dificultad y un "destino espacial" asociado, según esta tabla:
- muy_facil -> "La Luna"
- moderado -> "Marte"
- considerable -> "Júpiter" o "Saturno"
- ambicioso -> "Urano" o "Neptuno"
- extremo -> "Plutón"

Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin explicaciones, sin bloques de código markdown) que siga EXACTAMENTE esta estructura:

{
  "titulo": "string",
  "destino_espacial": "La Luna|Marte|Júpiter|Saturno|Urano|Neptuno|Plutón",
  "dificultad": "muy_facil|moderado|considerable|ambicioso|extremo",
  "tiempo_estimado_semanas": integer,
  "steps": [
    {
      "orden": integer,
      "titulo": "string",
      "descripcion": "string",
      "proyecto_aprendizaje": "string",
      "tiempo_estimado_semanas": integer,
      "tareas": [
        {
          "titulo": "string",
          "descripcion": "string"
        }
      ]
    }
  ]
}

Requisitos:
- "titulo" debe resumir la ruta completa.
- "tiempo_estimado_semanas" de la ruta debe ser la suma aproximada de las semanas de todos los pasos.
- Cada "step" debe tener un "orden" secuencial empezando en 1.
- "proyecto_aprendizaje" debe describir un proyecto práctico para afianzar lo aprendido en ese paso.
- Genera entre 3 y 8 pasos, según la complejidad del destino.
- Cada "step" debe incluir un array "tareas" con entre 3 y 6 tareas concretas y accionables que el usuario debe completar para avanzar en ese paso. Cada tarea debe tener "titulo" (acción breve y concreta) y "descripcion" (explicación breve de cómo realizarla).
PROMPT;
    }

    /**
     * Extrae y decodifica el JSON contenido en la respuesta de Gemini.
     *
     * Qué hace: localiza el primer bloque "{...}" dentro del texto devuelto
     * por la IA (por si viene rodeado de texto adicional o de bloques de
     * código markdown) y lo decodifica a un array asociativo.
     *
     * Por qué existe: Gemini no siempre devuelve JSON puro, a veces lo
     * envuelve en explicaciones o en ```json ... ```, así que hay que
     * extraerlo de forma robusta antes de parsearlo.
     *
     * Recibe: $texto (la respuesta cruda de Gemini).
     * Devuelve: array asociativo con la estructura de la ruta generada.
     *
     * @throws Exception si no se encuentra JSON o no se puede decodificar.
     */
    private function extraerJson(string $texto): array
    {
        if (!preg_match('/\{.*\}/s', $texto, $coincidencias)) {
            throw new Exception('La respuesta de Gemini no contiene un JSON válido: ' . $texto);
        }

        $datos = json_decode($coincidencias[0], true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($datos)) {
            throw new Exception('No se pudo interpretar el JSON devuelto por Gemini: ' . json_last_error_msg());
        }

        return $datos;
    }
}
