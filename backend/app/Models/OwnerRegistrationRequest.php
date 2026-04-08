<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OwnerRegistrationRequest extends Model
{
    protected $fillable = [
        'user_id',
        'request_type',
        'business_name',
        'id_number',
        'experience_years',
        'current_properties',
        'message',
        'status',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
        'rejected_notice_seen_at',
        'approved_notice_seen_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'rejected_notice_seen_at' => 'datetime',
        'approved_notice_seen_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}