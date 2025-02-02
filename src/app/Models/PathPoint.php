<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PathPoint extends Model
{
    use HasFactory;

    protected $table = 'path_point';
    public $timestamps = false;

    protected $guarded = [];
}
