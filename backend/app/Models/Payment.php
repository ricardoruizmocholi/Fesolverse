<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo Payment.
 *
 * Qué representa: un pago (intento de PaymentIntent de Stripe) realizado
 * por un usuario para actualizar su plan de "free" a "pro". Por qué existe:
 * permite guardar el historial de pagos y su estado ('pending',
 * 'completed', 'failed'), verificándolo siempre contra Stripe (Fase 7).
 */
class Payment extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'stripe_payment_intent_id',
        'amount',
        'currency',
        'estado',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
        ];
    }

    /**
     * Usuario al que pertenece este pago.
     *
     * @return BelongsTo<User, Payment>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
