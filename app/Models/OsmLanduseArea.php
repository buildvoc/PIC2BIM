<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class OsmLanduseArea extends Model
{
    use HasFactory;

    protected $table = 'osm_landuse_area';
    
    public $timestamps = false;

    protected $fillable = [
        'source',
        'osm_id',
        'name',
        'geom',
        'landuse',
        'operator',
        'ref',
        'start_date',
        'opening_date',
        'end_date',
        'tags',
    ];

    protected $casts = [
        'osm_id' => 'integer',
        'start_date' => 'date',
        'opening_date' => 'date',
        'end_date' => 'date',
        'tags' => 'array',
    ];

    /**
     * Get the geometry as GeoJSON
     */
    public function getGeometryAttribute()
    {
        if ($this->geom) {
            return json_decode(DB::selectOne("SELECT ST_AsGeoJSON(?) as geojson", [$this->geom])->geojson);
        }
        return null;
    }

    /**
     * Set geometry from GeoJSON
     */
    public function setGeometryAttribute($value)
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value);
        }
        
        if ($value) {
            // Transform from WGS84 to BNG (EPSG:27700)
            $this->attributes['geom'] = DB::selectOne(
                "SELECT ST_Transform(ST_GeomFromGeoJSON(?), 27700) as geom", 
                [$value]
            )->geom;
        }
    }

    /**
     * Scope to get landuse areas within bounds (WGS84 coordinates)
     */
    public function scopeWithinBounds($query, $minLat, $minLng, $maxLat, $maxLng)
    {
        return $query->whereRaw(
            "ST_Intersects(ST_Transform(geom, 4326), ST_MakeEnvelope(?, ?, ?, ?, 4326))",
            [$minLng, $minLat, $maxLng, $maxLat]
        );
    }

    /**
     * Scope to find landuse areas that contain a point (WGS84 coordinates)
     */
    public function scopeContainsPoint($query, $lat, $lng)
    {
        return $query->whereRaw(
            "ST_Contains(ST_Transform(geom, 4326), ST_SetSRID(ST_MakePoint(?, ?), 4326))",
            [$lng, $lat]
        );
    }

    /**
     * Scope to find landuse areas that intersect with a geometry
     */
    public function scopeIntersects($query, $geometry)
    {
        return $query->whereRaw("ST_Intersects(geom, ?)", [$geometry]);
    }

    /**
     * Scope to filter by landuse type
     */
    public function scopeByLanduse($query, $landuse)
    {
        return $query->where('landuse', $landuse);
    }

    /**
     * Scope to search by name
     */
    public function scopeByName($query, $name)
    {
        return $query->where('name', 'ILIKE', '%' . $name . '%');
    }

    /**
     * Scope to filter by operator
     */
    public function scopeByOperator($query, $operator)
    {
        return $query->where('operator', 'ILIKE', '%' . $operator . '%');
    }

    /**
     * Get landuse areas with geometry as GeoJSON
     */
    public static function getWithGeometry($limit = null)
    {
        $query = self::select([
            'id',
            'source',
            'osm_id',
            'name',
            'landuse',
            'operator',
            'ref',
            'start_date',
            'opening_date',
            'end_date',
            'tags',
            DB::raw('ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry')
        ]);

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get()->map(function ($area) {
            $area->geometry = json_decode($area->geometry);
            return $area;
        });
    }

    /**
     * Get area in square meters
     */
    public function getAreaAttribute()
    {
        if ($this->geom) {
            return DB::selectOne("SELECT ST_Area(?) as area", [$this->geom])->area;
        }
        return null;
    }

    /**
     * Get perimeter in meters
     */
    public function getPerimeterAttribute()
    {
        if ($this->geom) {
            return DB::selectOne("SELECT ST_Perimeter(?) as perimeter", [$this->geom])->perimeter;
        }
        return null;
    }

    /**
     * Get centroid as WGS84 coordinates
     */
    public function getCentroidAttribute()
    {
        if ($this->geom) {
            $result = DB::selectOne(
                "SELECT ST_X(ST_Transform(ST_Centroid(?), 4326)) as lng, ST_Y(ST_Transform(ST_Centroid(?), 4326)) as lat",
                [$this->geom, $this->geom]
            );
            return ['lat' => $result->lat, 'lng' => $result->lng];
        }
        return null;
    }

    /**
     * Check if landuse area has specific tag
     */
    public function hasTag($key, $value = null)
    {
        if (!$this->tags) {
            return false;
        }

        if ($value === null) {
            return array_key_exists($key, $this->tags);
        }

        return isset($this->tags[$key]) && $this->tags[$key] === $value;
    }

    /**
     * Get tag value
     */
    public function getTag($key, $default = null)
    {
        return $this->tags[$key] ?? $default;
    }
}
