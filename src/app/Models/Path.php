<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Path extends Model
{
    use HasFactory;

    public $timestamps = false;
    protected $table = 'path';
    protected $guarded = [];

    public function points()
    {
        return $this->hasMany(PathPoint::class, 'path_id');
    }
}
