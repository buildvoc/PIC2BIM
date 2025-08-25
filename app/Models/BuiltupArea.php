<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuiltupArea extends Model
{
    use HasFactory;

    protected $table = 'ons_bua';

    protected $primaryKey = 'fid';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'fid',
        'objectid_1',
        'gsscode',
        'bua24cd',
        'bua24nm',
        'bua24nmw',
        'geometry_a',
        'areahectar',
        'globalid',
        'geometry',
    ];
}
