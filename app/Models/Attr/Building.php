<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Building extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_building';
    protected $connection = 'pgsql';

    protected $fillable = [
        'osid'
    ];
}
