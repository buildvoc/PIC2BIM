<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandRegistryCadastral extends Model
{
    use HasFactory;

    protected $table = 'land_registry_cadastral';
    protected $connection = 'pgsql';

    protected $fillable = [
        'fid',
        'county_code',
        'county_name',
        'bng_easting',
        'bng_northing',
        'longitude',
        'latitude',
        'global_id',
    ];

    protected $spatialFields = ['geometry', 'geometry_bng'];
    
    protected $casts = [
        'fid' => 'integer',
        'county_code' => 'string',
        'county_name' => 'string',
        'bng_easting' => 'integer',
        'bng_northing' => 'integer',
        'longitude' => 'decimal:7',
        'latitude' => 'decimal:7',
        'global_id' => 'string',
        'geometry' => 'array',
        'geometry_bng' => 'array',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'id',
            'fid',
            'county_code',
            'county_name',
            'bng_easting',
            'bng_northing',
            'longitude',
            'latitude',
            'global_id',
            'created_at',
            'updated_at',
            DB::raw('public.ST_AsGeoJSON(geometry) as geometry'),
            DB::raw('public.ST_AsGeoJSON(geometry_bng) as geometry_bng')
        );
    }

    /**
     * Get geometry as GeoJSON for WGS84 (EPSG:4326)
     */
    public function getGeometryAttribute($value)
    {
        if ($value) {
            return json_decode($value, true);
        }
        return null;
    }

    /**
     * Get BNG geometry as GeoJSON for British National Grid (EPSG:27700)
     */
    public function getGeometryBngAttribute($value)
    {
        if ($value) {
            return json_decode($value, true);
        }
        return null;
    }
}
