<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandRegistryInspire extends Model
{
    use HasFactory;

    protected $table = 'land_registry_inspire';
    protected $connection = 'pgsql';

    protected $fillable = [
        'geom',
        'gml_id',
        'INSPIREID',
        'LABEL',
        'NATIONALCADASTRALREFERENCE',
        'VALIDFROM',
        'BEGINLIFESPANVERSION',
    ];

    protected $spatialFields = ['geom'];
    
    protected $casts = [
        'VALIDFROM' => 'datetime',
        'BEGINLIFESPANVERSION' => 'datetime',
        'geom' => 'array',
        'gml_id' => 'string',
        'INSPIREID' => 'integer',
        'LABEL' => 'integer',
        'NATIONALCADASTRALREFERENCE' => 'integer',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'gml_id',
            'INSPIREID',
            'LABEL',
            'NATIONALCADASTRALREFERENCE',
            'VALIDFROM',
            'BEGINLIFESPANVERSION',
            DB::raw('public.ST_AsGeoJSON(st_transform(geom, 4326)) as geom')
        );
    }
}
