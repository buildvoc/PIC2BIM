<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

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


    protected $spatialFields = ['geometry'];

    protected $casts = [
        'fid' => 'integer',
        'objectid_1' => 'integer',
        'gsscode' => 'string',
        'bua24cd' => 'string',
        'bua24nm' => 'string',
        'bua24nmw' => 'string',
        'geometry_a' => 'integer',
        'areahectar' => 'float',
        'globalid' => 'string',
        'geometry' => 'array',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'fid',
            'objectid_1',
            'gsscode',
            'bua24cd',
            'bua24nm',
            'bua24nmw',
            'geometry_a',
            'areahectar',
            'globalid',
            DB::raw('public.ST_AsGeoJSON(st_transform(geometry, 4326)) as geometry')
        );
    }
}
