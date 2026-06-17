<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo TokenUsage.
 *
 * Qué representa: un registro individual de consumo de tokens (de IA) por
 * parte de un usuario. Por qué existe: permite auditar y sumar el consumo
 * total para aplicar los límites del plan "free".
 */
class TokenUsage extends Model
{
    /**
     * Nombre real de la tabla (en singular, según la migración).
     *
     * @var string
     */
    protected $table = 'token_usage';

    /**
     * Esta tabla solo tiene "created_at" (con valor por defecto en BD),
     * no "updated_at", por lo que desactivamos la gestión automática de
     * timestamps de Eloquent.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'tokens_consumidos',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tokens_consumidos' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Usuario al que pertenece este registro de consumo.
     *
     * @return BelongsTo<User, TokenUsage>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
