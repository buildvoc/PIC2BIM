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
                'toid' => $this->toid,
                'description' => $this->description ?? null,
                'theme' => $this->theme ?? null,
                'absoluteheightroofbase' => $this->height_absoluteroofbase_m ?? null,
                'relativeheightroofbase' => $this->height_relativeroofbase_m ?? null,
                'absoluteheightmaximum' => $this->height_absolutemax_m ?? null,
                'relativeheightmaximum' => $this->height_relativemax_m ?? null,
                'absoluteheightminimum' => $this->height_absolutemin_m ?? null,
                'heightconfidencelevel' => $this->height_confidencelevel ?? null,
                'oslandcovertiera' => $this->oslandcovertiera ?? null,
                'oslandcovertierb' => $this->oslandcovertierb ?? null,
                'oslandusetiera' => $this->oslandusetiera ?? null,
                'oslandusetierb' => $this->oslandusetierb ?? null,
                'associatedstructure' => $this->associatedstructure ?? null,
                'isobscured' => $this->isobscured ?? null,
                'physicallevel' => $this->physicallevel ?? null,
                'area' => $this->geometry_area_m2 ?? null,
                'sites' => $this->buildingPartSiteRefs->map(function ($siteRef) {
                    return ['site_id' => $siteRef->siteid];
                }),
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
