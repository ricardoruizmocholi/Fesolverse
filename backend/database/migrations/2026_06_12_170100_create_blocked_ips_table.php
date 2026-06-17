<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Crea la tabla "blocked_ips", usada por el middleware de rate limiting
     * para guardar las IPs bloqueadas temporalmente tras superar el número
     * máximo de intentos de login fallidos.
     */
    public function up(): void
    {
        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip')->unique();
            $table->string('motivo')->nullable();
            $table->timestamp('bloqueada_hasta');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blocked_ips');
    }
};
