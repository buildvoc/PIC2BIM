<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UprnFeatureResource extends JsonResource
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
            'geometry' => $this->geom,
            'id' => $this->fid,
            'properties' => [
                'fid' => $this->fid,
                'uprn' => $this->uprn,
                'x_coordinate' => $this->x_coordinate,
                'y_coordinate' => $this->y_coordinate,
                'latitude' => $this->latitude,
                'longitude' => $this->longitude,
            ],
        ];
    }
}
