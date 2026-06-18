<?php

namespace App\Services;

use App\Models\Route;

/**
 * ArchivoRutasService
 *
 * Qué hace: centraliza la lógica de eliminación de rutas archivadas caducadas.
 * Se usa tanto desde el comando Artisan (ejecución automática/manual) como
 * desde el endpoint de administración (botón de limpieza manual en el panel).
 *
 * Por qué existe: evitar duplicar la consulta de borrado en dos sitios
 * distintos, de modo que si cambia el criterio (p.ej. el número de días) solo
 * hay que modificarlo aquí.
 */
class ArchivoRutasService
{
    /** Días que puede permanecer archivada una ruta antes de eliminarse. */
    public const DIAS_HASTA_ELIMINACION = 15;

    /**
     * Elimina todas las rutas archivadas que llevan más de DIAS_HASTA_ELIMINACION
     * días sin restaurarse.
     *
     * Las foreign keys con onDelete('cascade') de steps y tasks garantizan
     * que los pasos y tareas de cada ruta se eliminan automáticamente.
     *
     * Devuelve: el número de rutas eliminadas.
     */
    public static function eliminarCaducadas(): int
    {
        $limite = now()->subDays(self::DIAS_HASTA_ELIMINACION);

        return Route::where('archivada', true)
            ->where('archivada_en', '<=', $limite)
            ->delete();
    }
}
