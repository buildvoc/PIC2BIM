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
                'toid' => $this->toid,
                'uprn' => $this->matcheduprn,
                'changetype' => $this->changetype ?? null,
                'description' => $this->description ?? null,
                'buildinguse' => $this->oslandusetiera ?? null,
                'theme' => $this->theme ?? null,
                'area' => $this->geometry_area_m2 ?? null
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
