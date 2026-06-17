<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Step extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'route_id',
        'orden',
        'titulo',
        'descripcion',
        'proyecto_aprendizaje',
        'tiempo_estimado_semanas',
    ];

    /**
     * Atributos calculados que se añaden automáticamente al serializar el
     * modelo (por ejemplo, al incluirlo en la respuesta de RouteController).
     *
     * @var list<string>
     */
    protected $appends = [
        'progreso',
    ];

    /**
     * Ruta a la que pertenece este paso.
     *
     * Por qué existe: cada paso forma parte de una ruta de aprendizaje
     * generada por la IA.
     *
     * @return BelongsTo<Route, Step>
     */
    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    /**
     * Tareas del tablero Trello de este paso.
     *
     * Por qué existe: cada paso tiene su propio tablero de tareas
     * (pendiente, en progreso, completada) para organizar el aprendizaje.
     *
     * @return HasMany<Task>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Porcentaje de tareas completadas de este paso.
     *
     * Qué hace: calcula qué porcentaje de las tareas del paso están en
     * estado "completada". Si el paso no tiene tareas, devuelve 0.
     *
     * Por qué existe: permite mostrar una barra de progreso (StepProgress)
     * en el frontend sin tener que recalcular el porcentaje allí.
     *
     * Devuelve: un entero entre 0 y 100.
     */
    public function getProgresoAttribute(): int
    {
        $total = $this->tasks->count();

        if ($total === 0) {
            return 0;
        }

        $completadas = $this->tasks->where('estado', 'completada')->count();

        return (int) round(($completadas / $total) * 100);
    }
}
