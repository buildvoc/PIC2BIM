<?php

namespace App\Models\Attr;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Uprn extends Model
{
    use HasFactory;

    protected $table = 'osopenuprn_address';
    protected $connection = 'pgsql';
    protected $primaryKey = 'fid';
    public $incrementing = true;
    protected $keyType = 'int';
    public $timestamps = false;
    protected $fillable = [
        'fid',
        'uprn',
        'x_coordinate',
        'y_coordinate',
        'latitude',
        'longitude',
        'geom'
    ];

    protected $spatialFields = ['geom'];

    protected $casts = [
        'fid' => 'integer',
        'uprn' => 'integer',
        'x_coordinate' => 'float',
        'y_coordinate' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
        'geom' => 'array',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'fid',
            'uprn',
            'x_coordinate',
            'y_coordinate',
            'latitude',
            'longitude',
            DB::raw('public.ST_AsGeoJSON(st_transform(geom, 4326)) as geom')
        );
    }

    public function buildingAddresses()
    {
        return $this->hasMany(BuildingAddress::class, 'uprn', 'uprn');
    }
}
