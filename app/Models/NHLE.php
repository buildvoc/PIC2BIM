<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NHLE extends Model
{
    use HasFactory;

    protected $table = 'nhle_';
    protected $connection = 'pgsql';
    protected $primaryKey = 'gid';
    public $timestamps = false;

    protected $fillable = [
        'gid',
        'objectid',
        'listentry',
        'name',
        'grade',
        'listdate',
        'amenddate',
        'capturesca',
        'hyperlink',
        'ngr',
        'easting',
        'northing',
        'geom',
        'latitude',
        'longitude'
    ];

    protected $spatialFields = ['geom'];

    protected $casts = [
        'gid' => 'integer',
        'objectid' => 'integer',
        'listentry' => 'integer',
        'name' => 'string',
        'grade' => 'string',
        'listdate' => 'date',
        'amenddate' => 'date',
        'capturesca' => 'string',
        'hyperlink' => 'string',
        'ngr' => 'string',
        'easting' => 'string',
        'northing' => 'string',
        'geom' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'gid',
            'objectid',
            'listentry',
            'name',
            'grade',
            'hyperlink',
            'ngr',
            'latitude',
            'longitude',
            'easting',
            'northing',
            'listdate',
            'amenddate',
            'capturesca',
            DB::raw('public.ST_AsGeoJSON(st_transform(geom, 4326)) as geom')
        );
    }

}