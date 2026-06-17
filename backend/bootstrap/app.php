<?php

use App\Http\Middleware\IsAdmin;
use App\Http\Middleware\RateLimitLoginMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api.php',
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)
    ->withMiddleware(function (Middleware $middleware): void {
        // Alias para aplicar el rate limiting de login en routes/api.php.
        // "admin" protege las rutas del panel de administración (Fase 6),
        // permitiendo el acceso solo a usuarios con role === 'admin'.
        $middleware->alias([
            'login.throttle' => RateLimitLoginMiddleware::class,
            'admin' => IsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
