<?php

namespace App\Console\Commands;

use App\Services\ArchivoRutasService;
use Illuminate\Console\Command;

/**
 * EliminarRutasArchivadasCaducadas
 *
 * Qué hace: elimina todas las rutas archivadas que llevan más de 15 días
 * sin restaurarse. Está pensado para ejecutarse diariamente mediante el
 * scheduler de Laravel, aunque también puede lanzarse manualmente:
 *
 *   php artisan rutas:limpiar-archivadas
 *
 * Por qué existe: las rutas archivadas no se eliminan de inmediato para dar
 * al usuario una ventana de 15 días para restaurarlas. Este comando es el
 * encargado de hacer la limpieza diferida.
 *
 * El borrado en cascada de steps y tasks lo garantizan las foreign keys
 * "onDelete('cascade')" definidas en sus migraciones.
 */
class EliminarRutasArchivadasCaducadas extends Command
{
    protected $signature = 'rutas:limpiar-archivadas';

    protected $description = 'Elimina las rutas archivadas que llevan más de '
        . ArchivoRutasService::DIAS_HASTA_ELIMINACION
        . ' días sin restaurarse.';

    public function handle(): int
    {
        $eliminadas = ArchivoRutasService::eliminarCaducadas();

        $this->info("Limpieza completada: {$eliminadas} ruta(s) archivada(s) caducada(s) eliminada(s).");

        return Command::SUCCESS;
    }
}
