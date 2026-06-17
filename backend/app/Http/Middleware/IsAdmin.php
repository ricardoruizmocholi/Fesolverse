<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware IsAdmin.
 *
 * Qué hace: comprueba que el usuario autenticado (Sanctum) tiene el rol
 * "admin". Si no es así, corta la petición con un 403 antes de llegar al
 * controlador.
 *
 * Por qué existe: protege todas las rutas del panel de administración
 * (Fase 6) para que solo los administradores puedan acceder a ellas.
 *
 * Recibe: la Request entrante (ya autenticada por "auth:sanctum") y el
 * siguiente eslabón ($next) de la cadena de middlewares/controlador.
 * Devuelve: un JSON 403 si el usuario no es administrador, o la respuesta
 * normal del controlador si lo es.
 */
class IsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Acceso restringido a administradores',
            ], 403);
        }

        return $next($request);
    }
}
