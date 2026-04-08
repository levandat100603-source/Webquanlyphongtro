<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingRegistration extends Model
{
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
        'verification_code',
        'verification_expires_at',
    ];

    protected $casts = [
        'verification_expires_at' => 'datetime',
    ];
}