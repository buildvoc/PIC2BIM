<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BuildingPart extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_buildingpart';
    protected $connection = 'pgsql';
    protected $fillable = [
        'osid',
        'toid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'firstdigitalcapturedate',
        'changetype',
        'geometry',
        'geometry_area',
        'geometry_evidencedate',
        'geometry_updatedate',
        'geometry_source',
        'theme',
        'description',
        'description_evidencedate',
        'description_updatedate',
        'description_source',
        'oslandcovertiera',
        'oslandcovertierb',
        'oslandcover_evidencedate',
        'oslandcover_updatedate',
        'oslandcover_source',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_source',
        'absoluteheightroofbase',
        'relativeheightroofbase',
        'absoluteheightmaximum',
        'relativeheightmaximum',
        'absoluteheightminimum',
        'heightconfidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'height_source',
        'associatedstructure',
        'isobscured',
        'physicallevel',
        'capturespecification'
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
        'geometry_area',
        'geometry_evidencedate',
        'geometry_updatedate',
        'geometry_source',
        'theme',
        'description',
        'description_evidencedate',
        'description_updatedate',
        'description_source',
        'oslandcovertiera',
        'oslandcovertierb',
        'oslandcover_evidencedate',
        'oslandcover_updatedate',
        'oslandcover_source',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_source',
        'absoluteheightroofbase',
        'relativeheightroofbase',
        'absoluteheightmaximum',
        'relativeheightmaximum',
        'absoluteheightminimum',
        'heightconfidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'height_source',
        'associatedstructure',
        'isobscured',
        'physicallevel',
        'capturespecification'
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
                                'geometry_area' => $this->geometry_area ,
                                'geometry_evidencedate' => $this->geometry_evidencedate ,
                                'geometry_updatedate' => $this->geometry_updatedate ,
                                'geometry_source' => $this->geometry_source ,
                                'theme' => $this->theme ,
                                'description' => $this->description ,
                                'description_evidencedate' => $this->description_evidencedate ,
                                'description_updatedate' => $this->description_updatedate ,
                                'description_source' => $this->description_source ,
                                'oslandcovertiera' => $this->oslandcovertiera ,
                                'oslandcovertierb' => $this->oslandcovertierb ,
                                'oslandcover_evidencedate' => $this->oslandcover_evidencedate ,
                                'oslandcover_updatedate' => $this->oslandcover_updatedate ,
                                'oslandcover_source' => $this->oslandcover_source ,
                                'oslandusetiera' => $this->oslandusetiera ,
                                'oslandusetierb' => $this->oslandusetierb ,
                                'oslanduse_evidencedate' => $this->oslanduse_evidencedate ,
                                'oslanduse_updatedate' => $this->oslanduse_updatedate ,
                                'oslanduse_source' => $this->oslanduse_source,
                                'absoluteheightroofbase' => $this->absoluteheightroofbase,
                                'relativeheightroofbase' => $this->relativeheightroofbase,
                                'absoluteheightmaximum' => $this->absoluteheightmaximum,
                                'relativeheightmaximum' => $this->relativeheightmaximum,
                                'absoluteheightminimum' => $this->absoluteheightminimum,
                                'heightconfidencelevel' => $this->heightconfidencelevel,
                                'height_evidencedate' => $this->height_evidencedate,
                                'height_updatedate' => $this->height_updatedate,
                                'height_source' => $this->height_source,
                                'associatedstructure' => $this->associatedstructure,
                                'isobscured' => $this->isobscured,
                                'physicallevel' => $this->physicallevel,
                                'capturespecification' => $this->capturespecification

                            ],
                            'type' => 'Feature',
                        ]
                    ]
                ];
            }
        );
    }

}
