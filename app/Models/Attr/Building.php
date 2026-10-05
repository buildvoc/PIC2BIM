<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Building extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'osid';
    public $incrementing = false;
    protected $keyType = 'string';
    use HasFactory;

    protected $table = 'bld_fts_building';
    protected $connection = 'pgsql';

    protected $fillable = [
        'osid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'changetype',
        'geometry',
        'geometry_area_m2',
        'geometry_updatedate',
        'theme',
        'description',
        'description_updatedate',
        'physicalstate',
        'physicalstate_updatedate',
        'buildingpartcount',
        'isinsite',
        'primarysiteid',
        'containingsitecount',
        'mainbuildingid',
        'mainbuildingid_ismainbuilding',
        'mainbuildingid_updatedate',
        'buildinguse',
        'buildinguse_oslandusetiera',
        'buildinguse_addresscount_total',
        'buildinguse_addresscount_residential',
        'buildinguse_addresscount_commercial',
        'buildinguse_addresscount_other',
        'buildinguse_updatedate',
        'connectivity',
        'connectivity_count',
        'connectivity_updatedate',
        'constructionmaterial',
        'constructionmaterial_evidencedate',
        'constructionmaterial_updatedate',
        'constructionmaterial_source',
        'constructionmaterial_capturemethod',
        'constructionmaterial_thirdpartyprovenance',
        'buildingage_period',
        'buildingage_year',
        'buildingage_evidencedate',
        'buildingage_updatedate',
        'buildingage_source',
        'buildingage_capturemethod',
        'buildingage_thirdpartyprovenance',
        'basementpresence',
        'basementpresence_selfcontained',
        'basementpresence_evidencedate',
        'basementpresence_updatedate',
        'basementpresence_source',
        'basementpresence_capturemethod',
        'basementpresence_thirdpartyprovenance',
        'numberoffloors',
        'numberoffloors_evidencedate',
        'numberoffloors_updatedate',
        'numberoffloors_source',
        'numberoffloors_capturemethod',
        'height_absolutemin_m',
        'height_absoluteroofbase_m',
        'height_absolutemax_m',
        'height_relativeroofbase_m',
        'height_relativemax_m',
        'height_confidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'roofmaterial_primarymaterial',
        'roofmaterial_solarpanelpresence',
        'roofmaterial_greenroofpresence',
        'roofmaterial_confidenceindicator',
        'roofmaterial_evidencedate',
        'roofmaterial_updatedate',
        'roofmaterial_capturemethod',
        'roofshapeaspect_shape',
        'roofshapeaspect_areapitched_m2',
        'roofshapeaspect_areaflat_m2',
        'roofshapeaspect_areafacingnorth_m2',
        'roofshapeaspect_areafacingnortheast_m2',
        'roofshapeaspect_areafacingeast_m2',
        'roofshapeaspect_areafacingsoutheast_m2',
        'roofshapeaspect_areafacingsouth_m2',
        'roofshapeaspect_areafacingsouthwest_m2',
        'roofshapeaspect_areafacingwest_m2',
        'roofshapeaspect_areafacingnorthwest_m2',
        'roofshapeaspect_areaindeterminable_m2',
        'roofshapeaspect_areatotal_m2',
        'roofshapeaspect_confidenceindicator',
        'roofshapeaspect_evidencedate',
        'roofshapeaspect_updatedate',
        'roofshapeaspect_capturemethod',
    ];

    public function buildingAddresses()
    {
        return $this->hasMany(BuildingAddress::class, 'buildingid', 'osid');
    }

    public function buildingPartLinks()
    {
        return $this->hasMany(BuildingPartLink::class, 'buildingid', 'osid');
    }

    public function sites()
    {
        return $this->belongsToMany(Site::class, 'bld_fts_building_bldtostecrossref', 'buildingid', 'siteid');
    }
}
