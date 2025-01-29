<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PhotoResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'altitude' => $this->altitude,
            'vertical_view_angle' => $this->vertical_view_angle,
            'accuracy' => $this->accuracy,
            'distance' => $this->distance,
            'nmea_distance' => $this->nmea_distance,
            'device_manufacture' => $this->device_manufacture,
            'device_model' => $this->device_model,
            'device_platform' => $this->device_platform,
            'device_version' => $this->device_version,
            'efkLatGpsL1' => $this->efkLatGpsL1,
            'efkLngGpsL1' => $this->efkLngGpsL1,
            'efkAltGpsL1' => $this->efkAltGpsL1,
            'efkTimeGpsL1' => $this->efkTimeGpsL1,
            'efkLatGpsL5' => $this->efkLatGpsL5,
            'efkLngGpsL5' => $this->efkLngGpsL5,
            'efkAltGpsL5' => $this->efkAltGpsL5,
            'efkTimeGpsL5' => $this->efkTimeGpsL5,
            'efkLatGpsIf' => $this->efkLatGpsIf,
            'efkLngGpsIf' => $this->efkLngGpsIf,
            'efkAltGpsIf' => $this->efkAltGpsIf,
            'efkTimeGpsIf' => $this->efkTimeGpsIf,
            'efkLatGalE1' => $this->efkLatGalE1,
            'efkLngGalE1' => $this->efkLngGalE1,
            'efkAltGalE1' => $this->efkAltGalE1,
            'efkTimeGalE1' => $this->efkTimeGalE1,
            'efkLatGalE5' => $this->efkLatGalE5,
            'efkLngGalE5' => $this->efkLngGalE5,
            'efkAltGalE5' => $this->efkAltGalE5,
            'efkTimeGalE5' => $this->efkTimeGalE5,
            'efkLatGalIf' => $this->efkLatGalIf,
            'efkLngGalIf' => $this->efkLngGalIf,
            'efkAltGalIf' => $this->efkAltGalIf,
            'efkTimeGalIf' => $this->efkTimeGalIf,
            'note' => $this->note,
            'lat' => rtrim($this->lat,0),
            'lng' => rtrim($this->lng,0),
            'photo_heading' => $this->photo_heading,
            'created' => $this->created,
            'digest' => $this->digest,
            'id' => $this->id,
            'link' => $this->link,
            'angle' => $this->angle
        ];
    }
}
