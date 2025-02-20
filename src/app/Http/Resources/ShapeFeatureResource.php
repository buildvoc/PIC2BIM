<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShapeFeatureResource extends JsonResource
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
                'wd24cd' => $this->wd24cd,
                'wd24nm' => $this->wd24nm,
                'wd24nmw' => $this->wd24nmw,
                'bng_e' => $this->bng_e,
                'bng_n' => $this->bng_n,
                'globalid' => $this->globalid,
                'latitude' => $this->latitude,
                'longitude' => $this->longitude,
            ],
        ];
    }
}
