<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'address',
        'city',
        'district',
        'price',
        'area',
        'capacity',
        'utilities',
        'images',
        'status',
        'owner_id',
    ];

    protected $casts = [
        'utilities' => 'array',
        'images' => 'array',
        'price' => 'decimal:2',
        'area' => 'decimal:2',
    ];

    // Status: available, rented, maintenance
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
