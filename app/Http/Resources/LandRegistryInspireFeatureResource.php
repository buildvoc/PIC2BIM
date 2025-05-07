<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LandRegistryInspireFeatureResource extends JsonResource
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
            'id' => $this->gml_id,
            'geometry' => $this->geom,
            'properties' => [
                'gml_id' => $this->gml_id,
                'inspire_id' => $this->INSPIREID,
                'label' => $this->LABEL,
                'national_cadastral_reference' => $this->NATIONALCADASTRALREFERENCE,
                'valid_from' => $this->VALIDFROM,
                'begin_lifespan_version' => $this->BEGINLIFESPANVERSION
            ]
        ];
    }
} 