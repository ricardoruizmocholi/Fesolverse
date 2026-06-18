<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notifiable;
use Illuminate\Notifications\Notification;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'ip_registro',
        'tokens_usados',
        'plan',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'tokens_usados' => 'integer',
        ];
    }

    /**
     * Relación con los registros de consumo de tokens del usuario.
     *
     * Por qué existe: permite consultar el historial de consumo (tabla
     * token_usage) de cada usuario, por ejemplo para limitar el plan free.
     *
     * @return HasMany<TokenUsage>
     */
    public function tokenUsages(): HasMany
    {
        return $this->hasMany(TokenUsage::class);
    }

    /**
     * Rutas de aprendizaje generadas por el usuario.
     *
     * Por qué existe: permite listar las rutas del usuario y comprobar
     * cuántas ha generado (límite del plan free).
     *
     * @return HasMany<Route>
     */
    public function routes(): HasMany
    {
        return $this->hasMany(Route::class);
    }

    /**
     * Indica si el usuario tiene rol de administrador.
     *
     * Por qué existe: lo usa el middleware "admin" (IsAdmin) para proteger
     * las rutas del panel de administración, y el frontend para decidir si
     * muestra el enlace al panel de admin.
     *
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Pagos realizados por el usuario para actualizar su plan.
     *
     * Por qué existe: permite consultar el historial de pagos del usuario
     * (Fase 7) y comprobar si ya tiene algún pago completado.
     *
     * @return HasMany<Payment>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Envía la notificación de reset de contraseña con una URL que apunta
     * al frontend (SPA en localhost:5173) en lugar de al backend.
     *
     * Por qué se sobreescribe: el ResetPassword por defecto genera una URL
     * del backend de Laravel, pero en una SPA el formulario de reset vive
     * en el frontend. El token y el email se pasan como query params.
     *
     * @param string $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $url = 'http://localhost:5173/reset-password?token=' . $token
            . '&email=' . urlencode($this->getEmailForPasswordReset());

        $this->notify(new class($url) extends Notification {
            public function __construct(private string $url) {}

            /** @return string[] */
            public function via(object $notifiable): array
            {
                return ['mail'];
            }

            public function toMail(object $notifiable): MailMessage
            {
                return (new MailMessage)
                    ->subject('Restablecer contraseña — Fesolverse')
                    ->line('Has solicitado restablecer tu contraseña.')
                    ->action('Restablecer contraseña', $this->url)
                    ->line('Este enlace expirará en 60 minutos.')
                    ->line('Si no has solicitado este cambio, ignora este mensaje.');
            }
        });
    }
}
