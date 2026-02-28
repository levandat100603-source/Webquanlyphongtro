<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    // Roles: admin, user, saler
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isSaler()
    {
        return $this->role === 'saler';
    }

    public function isUser()
    {
        return $this->role === 'user';
    }

    public function rooms()
    {
        return $this->hasMany(Room::class, 'owner_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'user_id');
    }
}
