<?php

namespace App\Http\Controllers;

use App\Models\BlockedIp;
use App\Models\Route;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Controlador del panel de administración (Fase 6).
 *
 * Qué hace: expone las estadísticas generales de la plataforma y permite a
 * los administradores gestionar usuarios (bloquear/desbloquear su IP),
 * IPs bloqueadas y rutas generadas por cualquier usuario.
 *
 * Por qué existe: centraliza toda la lógica del panel de administración,
 * separada del resto de controladores "de usuario".
 *
 * Todas las rutas de este controlador están protegidas por los middlewares
 * "auth:sanctum" y "admin" (IsAdmin), por lo que aquí ya se asume que
 * $request->user() es un administrador.
 *
 * Todas las respuestas siguen la estructura:
 * { success: bool, data: {...}, message: string }
 */
class AdminController extends Controller
{
    /**
     * Número de elementos por página en los listados paginados.
     */
    private const POR_PAGINA = 20;

    /**
     * Estadísticas generales de la plataforma.
     *
     * Qué hace: calcula el total de usuarios y rutas, los nuevos de esta
     * semana, el reparto de usuarios por plan (free/pro) y el número de IPs
     * bloqueadas actualmente.
     *
     * Por qué existe: alimenta la sección "Dashboard" del panel de
     * administración.
     *
     * Recibe: nada.
     * Devuelve: JSON con las estadísticas (200).
     */
    public function dashboard()
    {
        $inicioSemana = now()->startOfWeek();

        return response()->json([
            'success' => true,
            'data' => [
                'total_usuarios' => User::count(),
                'usuarios_nuevos_semana' => User::where('created_at', '>=', $inicioSemana)->count(),
                'total_rutas' => Route::count(),
                'rutas_nuevas_semana' => Route::where('created_at', '>=', $inicioSemana)->count(),
                'usuarios_por_plan' => [
                    'free' => User::where('plan', 'free')->count(),
                    'pro' => User::where('plan', 'pro')->count(),
                ],
                'ips_bloqueadas' => BlockedIp::where('bloqueada_hasta', '>', now())->count(),
            ],
            'message' => 'Estadísticas obtenidas correctamente.',
        ]);
    }

    /**
     * Lista paginada de usuarios.
     *
     * Qué hace: devuelve los usuarios registrados (20 por página, de más
     * reciente a más antiguo), cada uno con el número de rutas que ha
     * generado ("routes_count"). Si se recibe el parámetro "search", filtra
     * por nombre o email que lo contengan.
     *
     * Por qué existe: alimenta la sección "Usuarios" del panel de
     * administración.
     *
     * Recibe: Request, opcionalmente con "search" (string).
     * Devuelve: JSON con el listado paginado de usuarios (200).
     */
    public function users(Request $request)
    {
        $consulta = User::query()->withCount('routes');

        $busqueda = $request->input('search');

        if (!empty($busqueda)) {
            $consulta->where(function ($query) use ($busqueda) {
                $query->where('name', 'like', "%{$busqueda}%")
                    ->orWhere('email', 'like', "%{$busqueda}%");
            });
        }

        $usuarios = $consulta->orderBy('created_at', 'desc')->paginate(self::POR_PAGINA);

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $usuarios,
            ],
            'message' => 'Usuarios obtenidos correctamente.',
        ]);
    }

    /**
     * Bloquea a un usuario (bloqueando la IP desde la que se registró).
     *
     * Qué hace: comprueba que el administrador no se está bloqueando a sí
     * mismo y que el usuario tiene una IP de registro, y crea (o actualiza,
     * si ya existía) una entrada en blocked_ips para esa IP, válida durante
     * 30 días.
     *
     * Por qué existe: permite a un administrador impedir el acceso de un
     * usuario problemático sin tener que tocar la base de datos a mano.
     *
     * Recibe: Request autenticado (el administrador) y el usuario a bloquear
     * (route model binding).
     * Devuelve: JSON con la IP bloqueada (200), o error si el administrador
     * intenta bloquearse a sí mismo (403) o el usuario no tiene IP de
     * registro (422).
     */
    public function blockUser(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'No puedes bloquearte a ti mismo.',
            ], 403);
        }

        if (empty($user->ip_registro)) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Este usuario no tiene una IP de registro asociada.',
            ], 422);
        }

        $bloqueo = BlockedIp::updateOrCreate(
            ['ip' => $user->ip_registro],
            [
                'motivo' => 'Bloqueado por administrador',
                'bloqueada_hasta' => now()->addDays(30),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'blocked_ip' => $bloqueo,
            ],
            'message' => 'Usuario bloqueado correctamente.',
        ]);
    }

    /**
     * Desbloquea a un usuario (elimina el bloqueo de su IP de registro).
     *
     * Qué hace: elimina, si existe, la entrada de blocked_ips cuya IP
     * coincide con la IP de registro del usuario.
     *
     * Por qué existe: permite a un administrador revertir un bloqueo
     * anterior sobre un usuario.
     *
     * Recibe: el usuario a desbloquear (route model binding).
     * Devuelve: JSON confirmando el desbloqueo (200).
     */
    public function unblockUser(User $user)
    {
        BlockedIp::where('ip', $user->ip_registro)->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Usuario desbloqueado correctamente.',
        ]);
    }

    /**
     * Lista las IPs bloqueadas actualmente.
     *
     * Qué hace: devuelve todas las entradas de blocked_ips cuyo bloqueo
     * todavía no ha expirado (bloqueada_hasta > ahora), de la más reciente
     * a la más antigua.
     *
     * Por qué existe: alimenta la sección "IPs Bloqueadas" del panel de
     * administración.
     *
     * Recibe: nada.
     * Devuelve: JSON con el listado de IPs bloqueadas (200).
     */
    public function blockedIps()
    {
        $ips = BlockedIp::where('bloqueada_hasta', '>', now())
            ->orderBy('bloqueada_hasta', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'blocked_ips' => $ips,
            ],
            'message' => 'IPs bloqueadas obtenidas correctamente.',
        ]);
    }

    /**
     * Desbloquea una IP concreta.
     *
     * Qué hace: elimina la entrada de blocked_ips indicada.
     *
     * Por qué existe: permite a un administrador desbloquear una IP
     * directamente desde la sección "IPs Bloqueadas", sin tener que pasar
     * por un usuario asociado.
     *
     * Recibe: la IP bloqueada a eliminar (route model binding).
     * Devuelve: JSON confirmando el desbloqueo (200).
     */
    public function unblockIp(BlockedIp $blockedIp)
    {
        $blockedIp->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'IP desbloqueada correctamente.',
        ]);
    }

    /**
     * Lista paginada de todas las rutas generadas por todos los usuarios.
     *
     * Qué hace: devuelve las rutas (20 por página, de más reciente a más
     * antigua) junto con el nombre y email del usuario al que pertenecen.
     *
     * Por qué existe: alimenta la sección "Rutas" del panel de
     * administración, donde un administrador puede revisar y moderar las
     * rutas generadas por cualquier usuario.
     *
     * Recibe: nada.
     * Devuelve: JSON con el listado paginado de rutas (200).
     */
    public function routes()
    {
        $rutas = Route::with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->paginate(self::POR_PAGINA);

        return response()->json([
            'success' => true,
            'data' => [
                'routes' => $rutas,
            ],
            'message' => 'Rutas obtenidas correctamente.',
        ]);
    }

    /**
     * Elimina una ruta (de cualquier usuario), con sus steps y tasks.
     *
     * Qué hace: elimina la ruta indicada. Sus steps (y las tasks de cada
     * step) se eliminan en cascada gracias a las claves foráneas
     * "onDelete('cascade')" definidas en sus migraciones.
     *
     * Por qué existe: permite a un administrador moderar y eliminar rutas
     * inapropiadas o de prueba de cualquier usuario.
     *
     * Recibe: la ruta a eliminar (route model binding).
     * Devuelve: JSON confirmando el borrado (200).
     */
    public function deleteRoute(Route $route)
    {
        $route->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => 'Ruta eliminada correctamente.',
        ]);
    }
}
