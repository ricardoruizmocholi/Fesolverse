<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Route extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'titulo',
        'destino',
        'punto_partida',
        'destino_espacial',
        'dificultad',
        'tiempo_estimado_semanas',
        'estado',
    ];

    /**
     * Usuario al que pertenece la ruta.
     *
     * Por qué existe: permite comprobar que el usuario autenticado es el
     * propietario de la ruta antes de mostrarla o eliminarla.
     *
     * @return BelongsTo<User, Route>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Pasos (steps) que forman la ruta generada.
     *
     * Por qué existe: una ruta se compone de varios pasos ordenados,
     * generados por la IA, cada uno con su propio proyecto de aprendizaje.
     *
     * @return HasMany<Step>
     */
    public function steps(): HasMany
    {
        return $this->hasMany(Step::class);
    }
}
