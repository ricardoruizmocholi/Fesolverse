<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('routes', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('titulo');
        $table->text('destino');
        $table->text('punto_partida');
        $table->string('destino_espacial'); // La Luna, Marte, Plutón...
        $table->enum('dificultad', ['muy_facil', 'moderado', 'considerable', 'ambicioso', 'extremo']);
        $table->integer('tiempo_estimado_semanas');
        $table->enum('estado', ['generando', 'completada', 'error'])->default('generando');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
