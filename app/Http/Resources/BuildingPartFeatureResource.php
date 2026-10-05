<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class BuildingPartFeatureResource extends JsonResource
{

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $geoJson = DB::selectOne("SELECT ST_AsGeoJSON(ST_Transform(geometry, 4326)) as geojson FROM bld_fts_buildingpart WHERE osid = ?", [$this->osid]);
        
        return [
            'type' => 'Feature',
            'id' => $this->osid,
            'properties' => [
                'osid' => $this->osid,
                'toid' => $this->toid,
                'description' => $this->description ?? null,
                'theme' => $this->theme ?? null,
                'absoluteheightroofbase' => $this->absoluteheightroofbase ?? null,
                'relativeheightroofbase' => $this->relativeheightroofbase ?? null,
                'absoluteheightmaximum' => $this->absoluteheightmaximum ?? null,
                'relativeheightmaximum' => $this->relativeheightmaximum ?? null,
                'absoluteheightminimum' => $this->absoluteheightminimum ?? null,
                'heightconfidencelevel' => $this->heightconfidencelevel ?? null,
                'oslandcovertiera' => $this->oslandcovertiera ?? null,
                'oslandcovertierb' => $this->oslandcovertierb ?? null,
                'oslandusetiera' => $this->oslandusetiera ?? null,
                'oslandusetierb' => $this->oslandusetierb ?? null,
                'associatedstructure' => $this->associatedstructure ?? null,
                'isobscured' => $this->isobscured ?? null,
                'physicallevel' => $this->physicallevel ?? null,
                'area' => $this->geometry_area ?? null
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
