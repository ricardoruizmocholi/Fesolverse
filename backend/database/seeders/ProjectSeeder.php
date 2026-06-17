<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Project;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        Project::create([
            'title' => 'Fesolverse',
            'description' => 'Portfolio interactivo con exploración espacial y IA',
            'tech_stack' => 'React, Laravel, Docker, OpenAI',
            'status' => 'active'
        ]);

        Project::create([
            'title' => 'Aventuras',
            'description' => 'Plataforma de turismo de aventura',
            'tech_stack' => 'WordPress, Elementor, PHP, MySQL',
            'status' => 'active'
        ]);
    }
}