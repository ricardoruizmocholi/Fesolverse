<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo BlockedIp.
 *
 * Qué representa: una IP bloqueada temporalmente para iniciar sesión.
 * Por qué existe: la usa el middleware de rate limiting (login.throttle)
 * para saber si una IP debe ser rechazada y hasta cuándo.
 */
class BlockedIp extends Model
{
    /**
     * Nombre real de la tabla.
     *
     * @var string
     */
    protected $table = 'blocked_ips';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'ip',
        'motivo',
        'bloqueada_hasta',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'bloqueada_hasta' => 'datetime',
        ];
    }
}
