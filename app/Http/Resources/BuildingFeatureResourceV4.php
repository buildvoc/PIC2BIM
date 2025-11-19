<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class BuildingFeatureResourceV4 extends JsonResource
{

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $geoJson = DB::selectOne("SELECT ST_AsGeoJSON(ST_Transform(geometry, 4326)) as geojson FROM bld_fts_building WHERE osid = ?", [$this->osid]);
        
        return [
            'type' => 'Feature',
            'id' => $this->osid,
            'properties' => [
                'osid' => $this->osid,
                'versiondate' => $this->versiondate ?? null,
                'versionavailablefromdate' => $this->versionavailablefromdate ?? null,
                'versionavailabletodate' => $this->versionavailabletodate ?? null,
                'changetype' => $this->changetype ?? null,
                'geometry_area_m2' => $this->geometry_area_m2 ?? null,
                'geometry_updatedate' => $this->geometry_updatedate ?? null,
                'theme' => $this->theme ?? null,
                'description' => $this->description ?? null,
                'description_updatedate' => $this->description_updatedate ?? null,
                'physicalstate' => $this->physicalstate ?? null,
                'physicalstate_updatedate' => $this->physicalstate_updatedate ?? null,
                'buildingpartcount' => $this->buildingpartcount ?? null,
                'isinsite' => $this->isinsite ?? null,
                'primarysiteid' => $this->primarysiteid ?? null,
                'containingsitecount' => $this->containingsitecount ?? null,
                'mainbuildingid' => $this->mainbuildingid ?? null,
                'mainbuildingid_ismainbuilding' => $this->mainbuildingid_ismainbuilding ?? null,
                'mainbuildingid_updatedate' => $this->mainbuildingid_updatedate ?? null,
                'buildinguse' => $this->buildinguse ?? null,
                'buildinguse_oslandusetiera' => $this->buildinguse_oslandusetiera ?? null,
                'buildinguse_addresscount_total' => $this->buildinguse_addresscount_total ?? null,
                'buildinguse_addresscount_residential' => $this->buildinguse_addresscount_residential ?? null,
                'buildinguse_addresscount_commercial' => $this->buildinguse_addresscount_commercial ?? null,
                'buildinguse_addresscount_other' => $this->buildinguse_addresscount_other ?? null,
                'buildinguse_updatedate' => $this->buildinguse_updatedate ?? null,
                'connectivity' => $this->connectivity ?? null,
                'connectivity_count' => $this->connectivity_count ?? null,
                'connectivity_updatedate' => $this->connectivity_updatedate ?? null,
                'constructionmaterial' => $this->constructionmaterial ?? null,
                'constructionmaterial_evidencedate' => $this->constructionmaterial_evidencedate ?? null,
                'constructionmaterial_updatedate' => $this->constructionmaterial_updatedate ?? null,
                'constructionmaterial_source' => $this->constructionmaterial_source ?? null,
                'constructionmaterial_capturemethod' => $this->constructionmaterial_capturemethod ?? null,
                'constructionmaterial_thirdpartyprovenance' => $this->constructionmaterial_thirdpartyprovenance ?? null,
                'buildingage_period' => $this->buildingage_period ?? null,
                'buildingage_year' => $this->buildingage_year ?? null,
                'buildingage_evidencedate' => $this->buildingage_evidencedate ?? null,
                'buildingage_updatedate' => $this->buildingage_updatedate ?? null,
                'buildingage_source' => $this->buildingage_source ?? null,
                'buildingage_capturemethod' => $this->buildingage_capturemethod ?? null,
                'buildingage_thirdpartyprovenance' => $this->buildingage_thirdpartyprovenance ?? null,
                'basementpresence' => $this->basementpresence ?? null,
                'basementpresence_selfcontained' => $this->basementpresence_selfcontained ?? null,
                'basementpresence_evidencedate' => $this->basementpresence_evidencedate ?? null,
                'basementpresence_updatedate' => $this->basementpresence_updatedate ?? null,
                'basementpresence_source' => $this->basementpresence_source ?? null,
                'basementpresence_capturemethod' => $this->basementpresence_capturemethod ?? null,
                'basementpresence_thirdpartyprovenance' => $this->basementpresence_thirdpartyprovenance ?? null,
                'numberoffloors' => $this->numberoffloors ?? null,
                'numberoffloors_evidencedate' => $this->numberoffloors_evidencedate ?? null,
                'numberoffloors_updatedate' => $this->numberoffloors_updatedate ?? null,
                'numberoffloors_source' => $this->numberoffloors_source ?? null,
                'numberoffloors_capturemethod' => $this->numberoffloors_capturemethod ?? null,
                'height_absolutemin_m' => $this->height_absolutemin_m ?? null,
                'height_absoluteroofbase_m' => $this->height_absoluteroofbase_m ?? null,
                'height_absolutemax_m' => $this->height_absolutemax_m ?? null,
                'height_relativeroofbase_m' => $this->height_relativeroofbase_m ?? null,
                'height_relativemax_m' => $this->height_relativemax_m ?? null,
                'height_confidencelevel' => $this->height_confidencelevel ?? null,
                'height_evidencedate' => $this->height_evidencedate ?? null,
                'height_updatedate' => $this->height_updatedate ?? null,
                'roofmaterial_primarymaterial' => $this->roofmaterial_primarymaterial ?? null,
                'roofmaterial_solarpanelpresence' => $this->roofmaterial_solarpanelpresence ?? null,
                'roofmaterial_greenroofpresence' => $this->roofmaterial_greenroofpresence ?? null,
                'roofmaterial_confidenceindicator' => $this->roofmaterial_confidenceindicator ?? null,
                'roofmaterial_evidencedate' => $this->roofmaterial_evidencedate ?? null,
                'roofmaterial_updatedate' => $this->roofmaterial_updatedate ?? null,
                'roofmaterial_capturemethod' => $this->roofmaterial_capturemethod ?? null,
                'roofshapeaspect_shape' => $this->roofshapeaspect_shape ?? null,
                'roofshapeaspect_areapitched_m2' => $this->roofshapeaspect_areapitched_m2 ?? null,
                'roofshapeaspect_areaflat_m2' => $this->roofshapeaspect_areaflat_m2 ?? null,
                'roofshapeaspect_areafacingnorth_m2' => $this->roofshapeaspect_areafacingnorth_m2 ?? null,
                'roofshapeaspect_areafacingnortheast_m2' => $this->roofshapeaspect_areafacingnortheast_m2 ?? null,
                'roofshapeaspect_areafacingeast_m2' => $this->roofshapeaspect_areafacingeast_m2 ?? null,
                'roofshapeaspect_areafacingsoutheast_m2' => $this->roofshapeaspect_areafacingsoutheast_m2 ?? null,
                'roofshapeaspect_areafacingsouth_m2' => $this->roofshapeaspect_areafacingsouth_m2 ?? null,
                'roofshapeaspect_areafacingsouthwest_m2' => $this->roofshapeaspect_areafacingsouthwest_m2 ?? null,
                'roofshapeaspect_areafacingwest_m2' => $this->roofshapeaspect_areafacingwest_m2 ?? null,
                'roofshapeaspect_areafacingnorthwest_m2' => $this->roofshapeaspect_areafacingnorthwest_m2 ?? null,
                'roofshapeaspect_areaindeterminable_m2' => $this->roofshapeaspect_areaindeterminable_m2 ?? null,
                'roofshapeaspect_areatotal_m2' => $this->roofshapeaspect_areatotal_m2 ?? null,
                'roofshapeaspect_confidenceindicator' => $this->roofshapeaspect_confidenceindicator ?? null,
                'roofshapeaspect_evidencedate' => $this->roofshapeaspect_evidencedate ?? null,
                'roofshapeaspect_updatedate' => $this->roofshapeaspect_updatedate ?? null,
                'roofshapeaspect_capturemethod' => $this->roofshapeaspect_capturemethod ?? null,
                
                // Existing relationship fields
                'uprn' => $this->buildingAddresses->map(function ($address) {
                    return ['uprn' => $address->uprn];
                }),
                'postcode' => $this->postcode ?? null,
                'sites' => $this->sites->map(function ($site) {
                    return ['site_id' => $site->osid];
                }),
                
                // Legacy field mappings for backward compatibility
                'area' => $this->geometry_area_m2 ?? null,
                'roofmaterial' => $this->roofmaterial_primarymaterial ?? null,
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
