<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'step_id',
        'titulo',
        'descripcion',
        'estado',
        'fecha_limite',
        'notas',
        'orden',
    ];

    /**
     * Paso (step) al que pertenece esta tarea.
     *
     * Por qué existe: cada tarea forma parte del tablero Trello de un paso
     * concreto de una ruta de aprendizaje.
     *
     * @return BelongsTo<Step, Task>
     */
    public function step(): BelongsTo
    {
        return $this->belongsTo(Step::class);
    }
}
