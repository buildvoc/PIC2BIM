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
    protected $fillable = [
        'gid',
        'objectid',
        'listentry',
        'name',
        'grade',
        'hyperlink',
        'ngr',
        'geom'
    ];

    protected $spatialFields = ['geom'];

    protected $casts = [
        'gid' => 'integer',
        'objectid' => 'integer',
        'listentry' => 'integer',
        'name' => 'string',
        'grade' => 'string',
        'hyperlink' => 'string',
        'ngr' => 'string',
        'geom' => 'array',
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
            DB::raw('public.ST_AsGeoJSON(st_transform(geom, 4326)) as geom')
        );
    }

}
