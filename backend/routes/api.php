<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RouteController;
use App\Http\Controllers\TaskController;

Route::get('/status', function () {
    return response()->json([
        'status' => 'ok',
        'project' => 'fesolverse',
        'message' => 'El universo está en línea'
    ]);
});

Route::apiResource('projects', ProjectController::class);

// --- Autenticación (rutas públicas) ---

// Registro de un nuevo usuario.
Route::post('/register', [AuthController::class, 'register']);

// Login. Protegido por el middleware de rate limiting por IP
// (máx. 5 intentos fallidos en 10 minutos, bloqueo de 30 minutos).
Route::post('/login', [AuthController::class, 'login'])->middleware('login.throttle');

// Enlace firmado de verificación de email enviado por correo tras el registro.
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware('signed')
    ->name('verification.verify');

// --- Autenticación (rutas protegidas con Sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/email/resend', [AuthController::class, 'resendVerification']);

    // --- Generador de rutas con IA ---
    // GET ?archivadas=true devuelve solo las rutas archivadas del usuario.
    Route::get('/routes', [RouteController::class, 'index']);
    Route::post('/routes/generate', [RouteController::class, 'generate']);
    Route::get('/routes/{route}', [RouteController::class, 'show']);
    Route::delete('/routes/{route}', [RouteController::class, 'destroy']);
    // Archivado de rutas: archive marca la ruta como archivada; unarchive la restaura.
    Route::post('/routes/{route}/archive', [RouteController::class, 'archive']);
    Route::post('/routes/{route}/unarchive', [RouteController::class, 'unarchive']);

    // --- Tablero de progreso tipo Trello (Fase 5) ---
    Route::get('/steps/{step}/tasks', [TaskController::class, 'index']);
    Route::post('/steps/{step}/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}/move', [TaskController::class, 'moveColumn']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    // --- Calendario centralizado (Fase 10) ---
    // Todas las tasks del usuario de todas sus rutas, con filtro opcional
    // por rango de fecha_limite (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD).
    Route::get('/calendar/tasks', [CalendarController::class, 'tasks']);
    // Actualiza solo la fecha_limite de una task (drag and drop semanal).
    Route::patch('/tasks/{task}/fecha', [CalendarController::class, 'updateFecha']);

    // --- Pagos con Stripe (Fase 7) ---
    Route::post('/payments/checkout', [PaymentController::class, 'createCheckoutSession']);
    Route::post('/payments/confirm', [PaymentController::class, 'confirmPayment']);
    Route::get('/payments/history', [PaymentController::class, 'history']);

    // --- Panel de administración (Fase 6), solo para usuarios admin ---
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::post('/users/{user}/block', [AdminController::class, 'blockUser']);
        Route::post('/users/{user}/unblock', [AdminController::class, 'unblockUser']);
        Route::get('/blocked-ips', [AdminController::class, 'blockedIps']);
        Route::delete('/blocked-ips/{blockedIp}', [AdminController::class, 'unblockIp']);
        // GET ?archivadas=true devuelve solo rutas archivadas con "dias_restantes".
        Route::get('/routes', [AdminController::class, 'routes']);
        Route::delete('/routes/{route}', [AdminController::class, 'deleteRoute']);
        // Archiva cualquier ruta (sin restricción de propietario).
        Route::post('/routes/{route}/archive', [AdminController::class, 'archiveRoute']);
        // Limpieza manual de emergencia: elimina las archivadas caducadas ahora.
        Route::post('/routes/limpiar-caducadas', [AdminController::class, 'limpiarArchivadasCaducadas']);
        // Historial de pagos de todos los usuarios con estadísticas.
        Route::get('/payments', [AdminController::class, 'payments']);
    });
});