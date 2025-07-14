<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BuildingFeatureResource extends JsonResource
{

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'type' => 'Feature',
            'id' => $this->osid,
            'properties' => [
                'osid' => $this->osid,
                'uprn' => $this->buildingAddresses->first()->uprn,
                'postcode' => $this->postcode,
                'description' => $this->description,
                'constructionmaterial' => $this->constructionmaterial,
                'roofmaterial' => $this->roofmaterial_primarymaterial,
                'buildinguse' => $this->buildinguse,
                'numberoffloors' => $this->numberoffloors
            ],
        ];
    }
}
