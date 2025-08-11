<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class BuildingFeatureResource extends JsonResource
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
                'uprn' => $this->buildingAddresses->first()->uprn ?? null,
                'postcode' => $this->postcode ?? null,
                'description' => $this->description ?? null,
                'constructionmaterial' => $this->constructionmaterial ?? null,
                'roofmaterial' => $this->roofmaterial_primarymaterial ?? null,
                'buildinguse' => $this->buildinguse ?? null,
                'numberoffloors' => $this->numberoffloors ?? null
            ],
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null
        ];
    }
}
