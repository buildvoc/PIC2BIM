<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CodepointFeatureResource extends JsonResource
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
            'geometry' => $this->geometry,
            'id' => $this->ogc_fid,
            'properties' => [
                'ogc_fid' => $this->ogc_fid,
                'postcode' => $this->postcode,
                'positional_quality_indicator' => $this->positional_quality_indicator,
                'country_code' => $this->country_code,
                'nhs_regional_ha_code' => $this->nhs_regional_ha_code,
                'nhs_ha_code' => $this->nhs_ha_code,
                'admin_county_code' => $this->admin_county_code,
                'admin_district_code' => $this->admin_district_code,
                'admin_ward_code' => $this->admin_ward_code,
            ],
        ];
    }
}
