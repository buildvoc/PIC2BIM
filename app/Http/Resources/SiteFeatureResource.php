<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class SiteFeatureResource extends JsonResource
{

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $geoJson = DB::selectOne("SELECT ST_AsGeoJSON(ST_Transform(geometry, 4326)) as geojson FROM lus_fts_site WHERE osid = ?", [$this->osid]);

        return [
            'type' => 'Feature',
            'id' => $this->osid,
            'properties' => [
                'osid' => $this->osid,
                'toid' => $this->toid ?? null,
                'versiondate' => $this->versiondate ?? null,
                'versionavailablefromdate' => $this->versionavailablefromdate ?? null,
                'versionavailabletodate' => $this->versionavailabletodate ?? null,
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
                'oslandusetiera' => $this->oslandusetiera ?? null,
                'oslandusetierb' => $this->oslandusetierb ?? null,
                'oslanduse_evidencedate' => $this->oslanduse_evidencedate ?? null,
                'oslanduse_updatedate' => $this->oslanduse_updatedate ?? null,
                'oslanduse_capturemethod' => $this->oslanduse_capturemethod ?? null,
                'stakeholder' => $this->stakeholder ?? null,
                'name1_text' => $this->name1_text ?? null,
                'name1_language' => $this->name1_language ?? null,
                'name1_evidencedate' => $this->name1_evidencedate ?? null,
                'name1_updatedate' => $this->name1_updatedate ?? null,
                'name2_text' => $this->name2_text ?? null,
                'name2_language' => $this->name2_language ?? null,
                'name2_evidencedate' => $this->name2_evidencedate ?? null,
                'name2_updatedate' => $this->name2_updatedate ?? null,
                'extentdefinition' => $this->extentdefinition ?? null,
                'matcheduprn' => $this->matcheduprn ?? null,
                'matcheduprn_method' => $this->matcheduprn_method ?? null,
                'address_classificationcode' => $this->address_classificationcode ?? null,
                'address_primarydescription' => $this->address_primarydescription ?? null,
                'address_secondarydescription' => $this->address_secondarydescription ?? null,
                'address_classificationcorrelation' => $this->address_classificationcorrelation ?? null,
                'address_classificationsource' => $this->address_classificationsource ?? null,
                'addresscount_total' => $this->addresscount_total ?? null,
                'addresscount_residential' => $this->addresscount_residential ?? null,
                'addresscount_commercial' => $this->addresscount_commercial ?? null,
                'addresscount_other' => $this->addresscount_other ?? null,
                'nlud_code' => $this->nlud_code ?? null,
                'nlud_orderdescription' => $this->nlud_orderdescription ?? null,
                'nlud_groupdescription' => $this->nlud_groupdescription ?? null,
                'mainbuildingid' => $this->mainbuildingid ?? null,
                'status' => $this->status ?? null,
                'status_updatedate' => $this->status_updatedate ?? null,
                
                // Relationship fields
                'buildings' => $this->buildings->map(function ($building) {
                    return ['osid' => $building->osid];
                }),
                'buildingparts' => $this->buildingPartSiteRefs->map(function ($buildingPart) {
                    return ['osid' => $buildingPart->osid];
                }),
                
                // Legacy field mappings for backward compatibility
                'uprn' => $this->matcheduprn,
                'buildinguse' => $this->oslandusetiera ?? null,
                'area' => $this->geometry_area_m2 ?? null,
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
