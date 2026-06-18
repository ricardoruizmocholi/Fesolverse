<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Elimina diariamente las rutas archivadas que llevan más de 15 días
// sin restaurarse. El comando puede ejecutarse manualmente en cualquier
// momento: php artisan rutas:limpiar-archivadas
Schedule::command('rutas:limpiar-archivadas')->daily();
