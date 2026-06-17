<?php

namespace App\Http\Middleware;

use App\Models\BlockedIp;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de rate limiting para el login.
 *
 * Qué hace: antes de procesar la petición comprueba si la IP que la realiza
 * está bloqueada (tabla blocked_ips). Si no lo está, deja pasar la petición
 * al controlador y, según el resultado del login, cuenta los intentos
 * fallidos en caché; si se superan MAX_INTENTOS dentro de VENTANA_MINUTOS,
 * bloquea la IP durante BLOQUEO_MINUTOS.
 *
 * Por qué existe: protege la ruta /api/login frente a ataques de fuerza
 * bruta, limitando a 5 intentos cada 10 minutos por IP y bloqueando la IP
 * 30 minutos si se supera ese límite.
 */
class RateLimitLoginMiddleware
{
    /**
     * Número máximo de intentos de login fallidos permitidos antes de bloquear la IP.
     */
    private const MAX_INTENTOS = 5;

    /**
     * Minutos durante los que se contabilizan los intentos fallidos.
     */
    private const VENTANA_MINUTOS = 10;

    /**
     * Minutos que dura el bloqueo temporal de la IP.
     */
    private const BLOQUEO_MINUTOS = 30;

    /**
     * Procesa la petición aplicando el rate limiting descrito arriba.
     *
     * Recibe: la Request entrante y el siguiente eslabón ($next) de la
     * cadena de middlewares/controlador.
     * Devuelve: una respuesta JSON 429 si la IP está bloqueada, o la
     * respuesta normal del controlador (registrando el intento si falla).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();

        // 1. Si la IP ya está bloqueada y el bloqueo no ha expirado, rechazamos
        //    la petición sin llegar al controlador de login.
        $bloqueo = BlockedIp::where('ip', $ip)
            ->where('bloqueada_hasta', '>', now())
            ->first();

        if ($bloqueo) {
            return response()->json([
                'success' => false,
                'data' => [
                    'bloqueada_hasta' => $bloqueo->bloqueada_hasta,
                ],
                'message' => 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.',
            ], 429);
        }

        /** @var Response $response */
        $response = $next($request);

        $clave = "login_intentos:{$ip}";

        // 2. Si el login ha fallado (401), incrementamos el contador de
        //    intentos fallidos de esta IP, con una caducidad igual a la
        //    ventana de tiempo que queremos vigilar.
        if ($response->getStatusCode() === 401) {
            $intentos = (int) Cache::get($clave, 0) + 1;
            Cache::put($clave, $intentos, now()->addMinutes(self::VENTANA_MINUTOS));

            // 3. Si se ha alcanzado el máximo de intentos, bloqueamos la IP.
            if ($intentos >= self::MAX_INTENTOS) {
                BlockedIp::updateOrCreate(
                    ['ip' => $ip],
                    [
                        'motivo' => 'Demasiados intentos de inicio de sesión fallidos',
                        'bloqueada_hasta' => now()->addMinutes(self::BLOQUEO_MINUTOS),
                    ]
                );

                Cache::forget($clave);
            }
        } elseif ($response->getStatusCode() === 200) {
            // 4. Si el login ha tenido éxito, reiniciamos el contador de esta IP.
            Cache::forget($clave);
        }

        return $response;
    }
}
