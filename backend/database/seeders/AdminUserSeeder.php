<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * AdminUserSeeder.
 *
 * Qué hace: crea (o actualiza, si ya existe) un usuario administrador por
 * defecto, con email "admin@fesolverse.com" y contraseña "admin123".
 *
 * Por qué existe: el panel de administración (Fase 6) necesita al menos un
 * usuario con role "admin" para poder acceder a él.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@fesolverse.com'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'plan' => 'pro',
                'email_verified_at' => now(),
            ]
        );
    }
}
