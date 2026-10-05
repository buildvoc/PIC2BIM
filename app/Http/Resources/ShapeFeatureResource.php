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
                'color' => $this->stringToColour($this->wd24cd),
            ],
        ];
    }

    function stringToColour($str) {
        $hash = 0;
        $chars = str_split($str);
        foreach ($chars as $char) {
            $hash = ord($char) + (($hash << 5) - $hash);
        }
    
        $colour = '#';
        for ($i = 0; $i < 3; $i++) {
            $value = ($hash >> ($i * 8)) & 0xff;
            $colour .= str_pad(dechex($value), 2, '0', STR_PAD_LEFT);
        }
    
        return $colour;
    }
}
