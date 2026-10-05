<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Site extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'lus_fts_site';
    protected $primaryKey = 'osid';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'osid',
        'toid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'changetype',
        'geometry',
        'geometry_area_m2',
        'geometry_evidencedate',
        'geometry_updatedate',
        'geometry_capturemethod',
        'theme',
        'description',
        'description_evidencedate',
        'description_updatedate',
        'description_capturemethod',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_capturemethod',
        'stakeholder',
        'name1_text',
        'name1_language',
        'name1_evidencedate',
        'name1_updatedate',
        'name2_text',
        'name2_language',
        'name2_evidencedate',
        'name2_updatedate',
        'extentdefinition',
        'matcheduprn',
        'matcheduprn_method',
        'address_classificationcode',
        'address_primarydescription',
        'address_secondarydescription',
        'address_classificationcorrelation',
        'address_classificationsource',
        'addresscount_total',
        'addresscount_residential',
        'addresscount_commercial',
        'addresscount_other',
        'nlud_code',
        'nlud_orderdescription',
        'nlud_groupdescription',
        'mainbuildingid',
        'status',
        'status_updatedate',
    ];

    protected $casts = [
        'versiondate' => 'date',
        'versionavailablefromdate' => 'datetime',
        'versionavailabletodate' => 'datetime',
        'geometry_evidencedate' => 'date',
        'geometry_updatedate' => 'date',
        'description_evidencedate' => 'date',
        'description_updatedate' => 'date',
        'oslanduse_evidencedate' => 'date',
        'oslanduse_updatedate' => 'date',
        'name1_evidencedate' => 'date',
        'name1_updatedate' => 'date',
        'name2_evidencedate' => 'date',
        'name2_updatedate' => 'date',
        'status_updatedate' => 'date',
        'addresscount_total' => 'integer',
        'addresscount_residential' => 'integer',
        'addresscount_commercial' => 'integer',
        'addresscount_other' => 'integer',
    ];

    public function buildings()
    {
        return $this->belongsToMany(Building::class, 'bld_fts_building_bldtostecrossref', 'siteid', 'buildingid');
    }

    public function buildingPartSiteRefs()
    {
        return $this->belongsToMany(BuildingPartV2::class, 'bld_fts_buildingpart_siteref_v2', 'siteid', 'buildingpartid');
    }
}
