<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BuildingPartV2 extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_buildingpart_v2';
    protected $connection = 'pgsql';
    protected $primaryKey = 'osid';
    public $incrementing = false;
    public $timestamps = false;

    protected $keyType = 'string';
    protected $fillable = [
        'osid',
        'toid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'firstdigitalcapturedate',
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
        'oslandcovertiera',
        'oslandcovertierb',
        'oslandcover_evidencedate',
        'oslandcover_updatedate',
        'oslandcover_capturemethod',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_capturemethod',
        'height_absoluteroofbase_m',
        'height_relativeroofbase_m',
        'height_absolutemax_m',
        'height_relativemax_m',
        'height_absolutemin_m',
        'height_confidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'associatedstructure',
        'isobscured',
        'physicallevel',
        'capturespecification',
        'containingsitecount',
        'smallestsite_siteid',
        'smallestsite_landusetiera',
        'smallestsite_landusetierb',
        'largestsite_landusetiera',
        'largestsite_landusetierb',
        'nlud_code',
        'nlud_orderdescription',
        'nlud_groupdescription',
        'address_classificationcode',
        'address_primarydescription',
        'address_secondarydescription',
        'lowertierlocalauthority_gsscode',
        'lowertierlocalauthority_count',
        'status',
        'status_updatedate'
    ];
    protected $hidden = [
        'osid',
        'toid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'firstdigitalcapturedate',
        'changetype',
        'geometry',
        'geometry_transformed',
        'geometry_json',
        'geometry_area_m2',
        'geometry_evidencedate',
        'geometry_updatedate',
        'geometry_capturemethod',
        'theme',
        'description',
        'description_evidencedate',
        'description_updatedate',
        'description_capturemethod',
        'oslandcovertiera',
        'oslandcovertierb',
        'oslandcover_evidencedate',
        'oslandcover_updatedate',
        'oslandcover_capturemethod',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_capturemethod',
        'height_absoluteroofbase_m',
        'height_relativeroofbase_m',
        'height_absolutemax_m',
        'height_relativemax_m',
        'height_absolutemin_m',
        'height_confidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'associatedstructure',
        'isobscured',
        'physicallevel',
        'capturespecification',
        'containingsitecount',
        'smallestsite_siteid',
        'smallestsite_landusetiera',
        'smallestsite_landusetierb',
        'largestsite_landusetiera',
        'largestsite_landusetierb',
        'nlud_code',
        'nlud_orderdescription',
        'nlud_groupdescription',
        'address_classificationcode',
        'address_primarydescription',
        'address_secondarydescription',
        'lowertierlocalauthority_gsscode',
        'lowertierlocalauthority_count',
        'status',
        'status_updatedate'
    ];
    protected $spatialFields = ['geometry'];
    protected $appends = ['geojson'];

    public function geojson(): Attribute
    {
        return Attribute::make(
            get: function () {
                return [
                    'type' => 'FeatureCollection',
                    'features' => [
                        [
                            'geometry' => json_decode($this->geometry_json),
                            'id' => $this->osid,
                            'properties' => [
                                'TOID' => $this->toid,
                                'versiondate' => $this->versiondate,
                                'versionavailablefromdate' => $this->versionavailablefromdate ,
                                'versionavailabletodate' => $this->versionavailabletodate ,
                                'firstdigitalcapturedate' => $this->firstdigitalcapturedate ,
                                'changetype' => $this->changetype ,
                                'geometry_area_m2' => $this->geometry_area_m2 ,
                                'geometry_evidencedate' => $this->geometry_evidencedate ,
                                'geometry_updatedate' => $this->geometry_updatedate ,
                                'geometry_capturemethod' => $this->geometry_capturemethod ,
                                'theme' => $this->theme ,
                                'description' => $this->description ,
                                'description_evidencedate' => $this->description_evidencedate ,
                                'description_updatedate' => $this->description_updatedate ,
                                'description_capturemethod' => $this->description_capturemethod ,
                                'oslandcovertiera' => $this->oslandcovertiera ,
                                'oslandcovertierb' => $this->oslandcovertierb ,
                                'oslandcover_evidencedate' => $this->oslandcover_evidencedate ,
                                'oslandcover_updatedate' => $this->oslandcover_updatedate ,
                                'oslandcover_capturemethod' => $this->oslandcover_capturemethod ,
                                'oslandusetiera' => $this->oslandusetiera ,
                                'oslandusetierb' => $this->oslandusetierb ,
                                'oslanduse_evidencedate' => $this->oslanduse_evidencedate ,
                                'oslanduse_updatedate' => $this->oslanduse_updatedate ,
                                'oslanduse_capturemethod' => $this->oslanduse_capturemethod,
                                'height_absoluteroofbase_m' => $this->height_absoluteroofbase_m,
                                'height_relativeroofbase_m' => $this->height_relativeroofbase_m,
                                'height_absolutemax_m' => $this->height_absolutemax_m,
                                'height_relativemax_m' => $this->height_relativemax_m,
                                'height_absolutemin_m' => $this->height_absolutemin_m,
                                'height_confidencelevel' => $this->height_confidencelevel,
                                'height_evidencedate' => $this->height_evidencedate,
                                'height_updatedate' => $this->height_updatedate,
                                'associatedstructure' => $this->associatedstructure,
                                'isobscured' => $this->isobscured,
                                'physicallevel' => $this->physicallevel,
                                'capturespecification' => $this->capturespecification,
                                'containingsitecount' => $this->containingsitecount,
                                'smallestsite_siteid' => $this->smallestsite_siteid,
                                'smallestsite_landusetiera' => $this->smallestsite_landusetiera,
                                'smallestsite_landusetierb' => $this->smallestsite_landusetierb,
                                'largestsite_landusetiera' => $this->largestsite_landusetiera,
                                'largestsite_landusetierb' => $this->largestsite_landusetierb,
                                'nlud_code' => $this->nlud_code,
                                'nlud_orderdescription' => $this->nlud_orderdescription,
                                'nlud_groupdescription' => $this->nlud_groupdescription,
                                'address_classificationcode' => $this->address_classificationcode,
                                'address_primarydescription' => $this->address_primarydescription,
                                'address_secondarydescription' => $this->address_secondarydescription,
                                'lowertierlocalauthority_gsscode' => $this->lowertierlocalauthority_gsscode,
                                'lowertierlocalauthority_count' => $this->lowertierlocalauthority_count,
                                'status' => $this->status,
                                'status_updatedate' => $this->status_updatedate

                            ],
                            'type' => 'Feature',
                        ]
                    ]
                ];
            }
        );
    }

    public function buildingPartSiteRefs()
    {
        return $this->hasMany(BuildingPartSiteRefV2::class, 'buildingpartid', 'osid');
    }

}
