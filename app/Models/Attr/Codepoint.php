<?php

namespace App\Models\Attr;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Codepoint extends Model
{
    use HasFactory;

    protected $table = 'codepoint';
    protected $connection = 'pgsql';
    protected $fillable = [
        'fid',
        'postcode',
        'positional_quality_indicator',
        'country_code',
        'nhs_regional_ha_code',
        'nhs_ha_code',
        'admin_county_code',
        'admin_district_code',
        'admin_ward_code',
    ];

    protected $spatialFields = ['geometry'];

    protected $casts = [
        'fid' => 'integer',
        'uprn' => 'integer',
        'positional_quality_indicator' => 'integer',
        'x_coordinate' => 'float',
        'y_coordinate' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
        'geometry' => 'array',
    ];

    public function newQuery()
    {
        return parent::newQuery()->select(
            'fid',
            'postcode', 
            'positional_quality_indicator', 
            'country_code', 
            'nhs_regional_ha_code', 
            'nhs_ha_code', 
            'admin_county_code', 
            'admin_district_code', 
            'admin_ward_code', 
            'uprn', 
            'x_coordinate', 
            'y_coordinate', 
            'latitude', 
            'longitude',
            DB::raw('public.ST_AsGeoJSON(st_transform(geometry, 4326)) as geometry')
        );
    }
}
