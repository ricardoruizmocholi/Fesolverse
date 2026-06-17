<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Añade a la tabla "users" los campos necesarios para el sistema de
     * autenticación y control de uso: la IP desde la que se registró el
     * usuario, el número de tokens (de IA) que ha consumido y el plan
     * de suscripción (free/pro).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('ip_registro')->nullable()->after('email');
            $table->unsignedInteger('tokens_usados')->default(0)->after('ip_registro');
            $table->enum('plan', ['free', 'pro'])->default('free')->after('tokens_usados');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['ip_registro', 'tokens_usados', 'plan']);
        });
    }
};
