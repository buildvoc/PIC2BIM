<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Land extends Model
{
    use HasFactory;

    protected $guarded = [];

    public $timestamps = false;

    protected $table = 'land';
    protected $casts =['wgs_geometry'=>'json'];    
    
    public function getWgsGeometryAttribute($value)
    {
        return json_decode($value, true);
    }
}
