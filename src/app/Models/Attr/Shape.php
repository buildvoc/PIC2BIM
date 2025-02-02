<?php

namespace App\Models\Attr;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Shape extends Model
{
    use HasFactory;

    protected $table = 'shape';
    protected $connection = 'pgsql';
    protected $fillable = [
        'ogc_fid',
        'wd24cd',
        'wd24nm',
        'wd24nmw',
        'bng_e',
        'bng_n',
        'latitude',
        'longitude',
        'globalid',
    ];

    protected $spatialFields = ['geometry'];

    protected $casts = [
        'ogc_fid' => 'integer',
        'bng_e' => 'integer',
        'bng_n' => 'integer',
        'latitude' => 'float',
        'longitude' => 'float',
        'geometry' => 'array',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'ogc_fid',
            'wd24cd',
            'wd24nm',
            'wd24nmw',
            'bng_e',
            'bng_n',
            'globalid',
            'lat as latitude', 
            'long as longitude',
            DB::raw('public.ST_AsGeoJSON(st_transform(wkb_geometry, 4326)) as geometry')
        );
    }
}
