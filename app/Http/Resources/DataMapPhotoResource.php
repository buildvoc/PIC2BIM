<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DataMapPhotoResource extends JsonResource
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
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [(float)$this->lng, (float)$this->lat]
            ],
            'id' => $this->id,
            'properties' => [
                'id' => $this->id,
                'path' => $this->path,
                'file_name' => $this->file_name,
                'user_name' => $this->user_name,
                'user_id' => $this->user_id,
                'photo_heading' => $this->photo_heading,
                'accuracy' => $this->accuracy,
                'created' => $this->created,
                'altitude' => $this->altitude,
                'note' => $this->note,
                'network_info' => $this->network_info,
                'lat' => $this->lat,
                'lng' => $this->lng,
                'link' => $this->link
            ],
        ];
    }
}
