<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class OsmBuildingPart extends Model
{
    use HasFactory;

    protected $table = 'osm_building_part';
    
    // Disable timestamps since the table doesn't have created_at/updated_at columns
    public $timestamps = false;

    protected $fillable = [
        'source',
        'osm_id',
        'name',
        'geom',
        'ref_gb_uprn',
        'base_shape',
        'base_direction',
        'base_orientation',
        'base_height_m',
        'base_levels',
        'base_colour',
        'base_material',
        'base_angle_deg',
        'building',
        'building_part',
        'building_levels',
        'building_min_level',
        'building_levels_underground',
        'roof_levels',
        'roof_shape',
        'height_m',
        'min_height_m',
        'roof_height_m',
        'levels',
        'min_level',
        'building_reference_number',
        'tenure',
        'construction_age_band',
        'transaction_type',
    ];

    protected $casts = [
        'osm_id' => 'integer',
        'base_direction' => 'decimal:5',
        'base_height_m' => 'decimal:2',
        'base_levels' => 'integer',
        'base_angle_deg' => 'decimal:2',
        'building_levels' => 'integer',
        'building_min_level' => 'integer',
        'building_levels_underground' => 'integer',
        'roof_levels' => 'integer',
        'height_m' => 'decimal:2',
        'min_height_m' => 'decimal:2',
        'roof_height_m' => 'decimal:2',
        'levels' => 'integer',
        'min_level' => 'integer',
    ];

    /**
     * Get the geometry as GeoJSON
     */
    public function getGeometryAttribute()
    {
        if ($this->geom) {
            $result = DB::selectOne("SELECT ST_AsGeoJSON(geom) as geojson FROM {$this->table} WHERE id = ?", [$this->id]);
            return $result ? json_decode($result->geojson, true) : null;
        }
        return null;
    }

    /**
     * Set geometry from GeoJSON or WKT
     */
    public function setGeomAttribute($value)
    {
        if (is_array($value)) {
            // GeoJSON format
            $this->attributes['geom'] = DB::raw("ST_GeomFromGeoJSON('" . json_encode($value) . "')");
        } elseif (is_string($value)) {
            // WKT format or raw geometry
            $this->attributes['geom'] = DB::raw("ST_GeomFromText('{$value}', 27700)");
        }
    }

    /**
     * Scope to filter by bounding box
     */
    public function scopeWithinBounds($query, $minLng, $minLat, $maxLng, $maxLat)
    {
        return $query->whereRaw(
            "ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 27700))",
            [$minLng, $minLat, $maxLng, $maxLat]
        );
    }

    /**
     * Scope to find buildings containing a point
     */
    public function scopeContainsPoint($query, $lng, $lat, $srid = 4326)
    {
        return $query->whereRaw(
            "ST_Contains(geom, ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), ?), 27700))",
            [$lng, $lat, $srid]
        );
    }

    /**
     * Scope to find buildings intersecting with geometry
     */
    public function scopeIntersects($query, $geometry, $srid = 4326)
    {
        if (is_array($geometry)) {
            // GeoJSON format
            return $query->whereRaw(
                "ST_Intersects(geom, ST_Transform(ST_GeomFromGeoJSON(?), ?))",
                [json_encode($geometry), 27700]
            );
        } else {
            // WKT format
            return $query->whereRaw(
                "ST_Intersects(geom, ST_Transform(ST_GeomFromText(?, ?), 27700))",
                [$geometry, $srid]
            );
        }
    }

    /**
     * Get buildings with their geometries as GeoJSON
     */
    public static function getWithGeometry($limit = null)
    {
        $query = self::select([
            '*',
            DB::raw('ST_AsGeoJSON(geom) as geometry_json')
        ]);

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get()->map(function ($item) {
            $item->geometry = json_decode($item->geometry_json, true);
            unset($item->geometry_json);
            return $item;
        });
    }
}
