<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Create Admin User
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@roomrental.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'phone' => '0123456789',
        ]);

        // Create Saler User
        User::create([
            'name' => 'Saler User',
            'email' => 'saler@roomrental.com',
            'password' => Hash::make('password'),
            'role' => 'saler',
            'phone' => '0123456788',
        ]);

        // Create Regular User
        User::create([
            'name' => 'Regular User',
            'email' => 'user@roomrental.com',
            'password' => Hash::make('password'),
            'role' => 'user',
            'phone' => '0123456787',
        ]);
    }
}
