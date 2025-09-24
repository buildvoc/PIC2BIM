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
                'device_manufacture' => $this->device_manufacture,
                'device_model' => $this->device_model,
                'device_platform' => $this->device_platform,
                'device_version' => $this->device_version,
                'network_info' => $this->network_info,
                'provider' => $this->provider,
                'lat' => $this->lat,
                'lng' => $this->lng,
                'link' => $this->link,
                'osnma_enabled' => $this->osnma_enabled,
                'osnma_validated' => $this->osnma_validated,
                'validated_sats' => $this->validated_sats,
            ],
        ];
    }
}
