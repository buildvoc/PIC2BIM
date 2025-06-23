<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NhleFeatureResource extends JsonResource
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
            'id' => $this->gid,
            'geometry' => $this->geom,
            'properties' => [
                'nhle_id' => $this->objectid,
                'list_entry' => $this->listentry,
                'name' => $this->name,
                'grade' => $this->grade,
                'hyperlink' => $this->hyperlink,
                'ngr' => $this->ngr
            ]
        ];
    }
} 