<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EntityLink extends Model
{
    use HasFactory;

    protected $table = 'entity_links';

    protected $fillable = [
        'src_type', 'src_id', 'relation', 'dst_type', 'dst_id',
        'status', 'source', 'confidence', 'bearing_delta', 'distance_m', 'note',
        'created_by', 'verified_by'
    ];

    protected $casts = [
        'confidence' => 'float',
        'bearing_delta' => 'float',
        'distance_m' => 'float',
    ];
}
