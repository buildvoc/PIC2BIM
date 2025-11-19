<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class BuildingPartFeatureResourceV2 extends JsonResource
{

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $geoJson = DB::selectOne("SELECT ST_AsGeoJSON(ST_Transform(geometry, 4326)) as geojson FROM bld_fts_buildingpart_v2 WHERE osid = ?", [$this->osid]);

        return [
            'type' => 'Feature',
            'id' => $this->osid,
            'properties' => [
                'osid' => $this->osid,
                'toid' => $this->toid ?? null,
                'versiondate' => $this->versiondate ?? null,
                'versionavailablefromdate' => $this->versionavailablefromdate ?? null,
                'versionavailabletodate' => $this->versionavailabletodate ?? null,
                'firstdigitalcapturedate' => $this->firstdigitalcapturedate ?? null,
                'changetype' => $this->changetype ?? null,
                'geometry_area_m2' => $this->geometry_area_m2 ?? null,
                'geometry_evidencedate' => $this->geometry_evidencedate ?? null,
                'geometry_updatedate' => $this->geometry_updatedate ?? null,
                'geometry_capturemethod' => $this->geometry_capturemethod ?? null,
                'theme' => $this->theme ?? null,
                'description' => $this->description ?? null,
                'description_evidencedate' => $this->description_evidencedate ?? null,
                'description_updatedate' => $this->description_updatedate ?? null,
                'description_capturemethod' => $this->description_capturemethod ?? null,
                'oslandcovertiera' => $this->oslandcovertiera ?? null,
                'oslandcovertierb' => $this->oslandcovertierb ?? null,
                'oslandcover_evidencedate' => $this->oslandcover_evidencedate ?? null,
                'oslandcover_updatedate' => $this->oslandcover_updatedate ?? null,
                'oslandcover_capturemethod' => $this->oslandcover_capturemethod ?? null,
                'oslandusetiera' => $this->oslandusetiera ?? null,
                'oslandusetierb' => $this->oslandusetierb ?? null,
                'oslanduse_evidencedate' => $this->oslanduse_evidencedate ?? null,
                'oslanduse_updatedate' => $this->oslanduse_updatedate ?? null,
                'oslanduse_capturemethod' => $this->oslanduse_capturemethod ?? null,
                'height_absoluteroofbase_m' => $this->height_absoluteroofbase_m ?? null,
                'height_relativeroofbase_m' => $this->height_relativeroofbase_m ?? null,
                'height_absolutemax_m' => $this->height_absolutemax_m ?? null,
                'height_relativemax_m' => $this->height_relativemax_m ?? null,
                'height_absolutemin_m' => $this->height_absolutemin_m ?? null,
                'height_confidencelevel' => $this->height_confidencelevel ?? null,
                'height_evidencedate' => $this->height_evidencedate ?? null,
                'height_updatedate' => $this->height_updatedate ?? null,
                'associatedstructure' => $this->associatedstructure ?? null,
                'isobscured' => $this->isobscured ?? null,
                'physicallevel' => $this->physicallevel ?? null,
                'capturespecification' => $this->capturespecification ?? null,
                'containingsitecount' => $this->containingsitecount ?? null,
                'smallestsite_siteid' => $this->smallestsite_siteid ?? null,
                'smallestsite_landusetiera' => $this->smallestsite_landusetiera ?? null,
                'smallestsite_landusetierb' => $this->smallestsite_landusetierb ?? null,
                'largestsite_landusetiera' => $this->largestsite_landusetiera ?? null,
                'largestsite_landusetierb' => $this->largestsite_landusetierb ?? null,
                'nlud_code' => $this->nlud_code ?? null,
                'nlud_orderdescription' => $this->nlud_orderdescription ?? null,
                'nlud_groupdescription' => $this->nlud_groupdescription ?? null,
                'address_classificationcode' => $this->address_classificationcode ?? null,
                'address_primarydescription' => $this->address_primarydescription ?? null,
                'address_secondarydescription' => $this->address_secondarydescription ?? null,
                'lowertierlocalauthority_gsscode' => $this->lowertierlocalauthority_gsscode ?? null,
                'lowertierlocalauthority_count' => $this->lowertierlocalauthority_count ?? null,
                'status' => $this->status ?? null,
                'status_updatedate' => $this->status_updatedate ?? null,
                
                // Relationship fields
                'sites' => $this->buildingPartSiteRefs->map(function ($siteRef) {
                    return ['site_id' => $siteRef->siteid];
                }),
                
                // Legacy field mappings for backward compatibility
                'area' => $this->geometry_area_m2 ?? null,
                'absoluteheightroofbase' => $this->height_absoluteroofbase_m ?? null,
                'relativeheightroofbase' => $this->height_relativeroofbase_m ?? null,
                'absoluteheightmaximum' => $this->height_absolutemax_m ?? null,
                'relativeheightmaximum' => $this->height_relativemax_m ?? null,
                'absoluteheightminimum' => $this->height_absolutemin_m ?? null,
                'heightconfidencelevel' => $this->height_confidencelevel ?? null,
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
