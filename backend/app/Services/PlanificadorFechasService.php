<?php

namespace App\Services;

use App\Models\Route;
use Carbon\Carbon;

/**
 * PlanificadorFechasService
 *
 * Qué hace: calcula las fechas_limite de todas las tareas de una ruta de
 * aprendizaje a partir de la fecha_inicio de la ruta, de forma determinística
 * y sin intervención de la IA.
 *
 * Algoritmo general:
 *   1. Se recorren los steps de forma acumulativa. El Step 1 empieza en
 *      fecha_inicio; el Step N empieza el día siguiente al último día del
 *      Step N-1.
 *   2. La duración de cada step es tiempo_estimado_semanas × 7 días. Si ese
 *      valor es 0 (o negativo), se garantiza una ventana mínima de 1 día para
 *      no generar fechas incoherentes.
 *   3. Dentro de la ventana [fechaInicioStep, fechaFinStep], las tareas del
 *      step se distribuyen de forma proporcional y equidistante usando la
 *      fórmula:
 *
 *        offset(i) = ceil(i × duracion / n) − 1   (i = 1..n, n = total tareas)
 *
 *      Con esta fórmula la primera tarea cae aproximadamente al final del
 *      primer segmento y la última tarea cae exactamente en fechaFinStep.
 *      Ejemplo: step de 14 días con 5 tareas → offsets 2, 5, 8, 11, 13.
 *
 *   4. Si un step no tiene tareas, se avanza el cursor igualmente para
 *      mantener el calendario del resto de steps.
 */
class PlanificadorFechasService
{
    /**
     * Planifica las fechas_limite de cada tarea en el array de steps.
     *
     * @param  Route  $route          Ruta con fecha_inicio ya guardada en BD.
     * @param  array  $stepsConTareas Array de steps tal como lo devuelve
     *                                GeminiService (antes de persistirse).
     * @return array  El mismo array con 'fecha_limite' (YYYY-MM-DD) añadida
     *                a cada tarea.
     */
    public function planificarFechas(Route $route, array $stepsConTareas): array
    {
        // Punto de partida temporal: fecha_inicio de la ruta.
        $cursorInicio = Carbon::parse($route->fecha_inicio)->startOfDay();

        foreach ($stepsConTareas as &$paso) {
            $semanas      = max(0, (int) ($paso['tiempo_estimado_semanas'] ?? 0));
            $duracionDias = max(1, $semanas * 7); // mínimo 1 día de ventana

            // Fecha del último día del step (inclusive).
            $fechaFin = $cursorInicio->copy()->addDays($duracionDias - 1);

            $tareas = &$paso['tareas'];

            if (is_array($tareas) && count($tareas) > 0) {
                $totalTareas = count($tareas);

                foreach ($tareas as $indice => &$tarea) {
                    // i va de 1 a n para que la última tarea quede en fechaFin.
                    $i = $indice + 1;

                    // offset = ceil(i × duracionDias / n) − 1
                    // Garantiza: offset(n) = ceil(n × d / n) − 1 = d − 1 = último día.
                    $offset = (int) ceil($i * $duracionDias / $totalTareas) - 1;

                    // Seguridad: nunca exceder fechaFin (solo ocurriría con
                    // redondeos en ventanas muy pequeñas).
                    $offset = min($offset, $duracionDias - 1);

                    $tarea['fecha_limite'] = $cursorInicio->copy()
                        ->addDays($offset)
                        ->toDateString(); // YYYY-MM-DD
                }
                unset($tarea);
            }

            // El siguiente step empieza el día posterior al fin de este.
            $cursorInicio = $fechaFin->copy()->addDay();
        }
        unset($paso);

        return $stepsConTareas;
    }
}
