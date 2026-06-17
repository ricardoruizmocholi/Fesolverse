<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Crea la tabla "token_usage", que guarda un registro por cada consumo
     * de tokens (de IA) que hace un usuario. Sirve para llevar la cuenta
     * del consumo y poder limitar el plan "free".
     */
    public function up(): void
    {
        Schema::create('token_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->unsignedInteger('tokens_consumidos');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('token_usage');
    }
};
