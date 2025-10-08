<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class OsmAddress extends Model
{
    use HasFactory;

    protected $table = 'osm_address';

    protected $fillable = [
        'building_part_id',
        'osm_id',
        'uprn',
        'source',
        'housenumber',
        'unit',
        'street',
        'suburb',
        'city',
        'postcode',
        'county',
        'state',
        'country',
        'country_code',
        'point_wgs84',
    ];

    protected $casts = [
        'building_part_id' => 'integer',
        'osm_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the geometry as GeoJSON
     */
    public function getGeometryAttribute()
    {
        if ($this->point_wgs84) {
            return json_decode(DB::selectOne("SELECT ST_AsGeoJSON(?) as geojson", [$this->point_wgs84])->geojson);
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
            $this->attributes['point_wgs84'] = DB::selectOne("SELECT ST_GeomFromGeoJSON(?) as geom", [$value])->geom;
        }
    }

    /**
     * Relationship with OsmBuildingPart
     */
    public function buildingPart()
    {
        return $this->belongsTo(OsmBuildingPart::class, 'building_part_id');
    }

    /**
     * Scope to get addresses within bounds
     */
    public function scopeWithinBounds($query, $minLat, $minLng, $maxLat, $maxLng)
    {
        return $query->whereRaw(
            "ST_Within(point_wgs84, ST_MakeEnvelope(?, ?, ?, ?, 4326))",
            [$minLng, $minLat, $maxLng, $maxLat]
        );
    }

    /**
     * Scope to find addresses near a point
     */
    public function scopeNearPoint($query, $lat, $lng, $radiusMeters = 1000)
    {
        return $query->whereRaw(
            "ST_DWithin(ST_Transform(point_wgs84, 27700), ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 27700), ?)",
            [$lng, $lat, $radiusMeters]
        );
    }

    /**
     * Scope to search by postcode
     */
    public function scopeByPostcode($query, $postcode)
    {
        return $query->where('postcode', 'ILIKE', '%' . $postcode . '%');
    }

    /**
     * Scope to search by street
     */
    public function scopeByStreet($query, $street)
    {
        return $query->where('street', 'ILIKE', '%' . $street . '%');
    }

    /**
     * Get addresses with geometry as GeoJSON
     */
    public static function getWithGeometry($limit = null)
    {
        $query = self::select([
            'id',
            'building_part_id',
            'osm_id',
            'uprn',
            'source',
            'housenumber',
            'unit',
            'street',
            'suburb',
            'city',
            'postcode',
            'county',
            'state',
            'country',
            'country_code',
            'created_at',
            'updated_at',
            DB::raw('ST_AsGeoJSON(point_wgs84) as geometry')
        ]);

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get()->map(function ($address) {
            $address->geometry = json_decode($address->geometry);
            return $address;
        });
    }

    /**
     * Get full address string
     */
    public function getFullAddressAttribute()
    {
        $parts = array_filter([
            $this->housenumber,
            $this->unit,
            $this->street,
            $this->suburb,
            $this->city,
            $this->postcode,
            $this->county,
            $this->country
        ]);

        return implode(', ', $parts);
    }

    /**
     * Check if address has minimal required data
     */
    public function hasMinimalData()
    {
        return !empty($this->street) || !empty($this->postcode) || !empty($this->housenumber);
    }
}
