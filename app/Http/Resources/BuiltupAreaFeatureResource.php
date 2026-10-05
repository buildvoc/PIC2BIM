<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class BuiltupAreaFeatureResource extends JsonResource
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
            'id' => $this->fid,
            'properties' => [
                'fid' => $this->fid,
                'bua24cd' => $this->bua24cd,
                'bua24nm' => $this->bua24nm,
                'bua24nmw' => $this->bua24nmw,
                'globalid' => $this->globalid,
                'areahectar' => $this->areahectar,
                'geometry_a' => $this->geometry_a,
                'color' => $this->stringToColour($this->bua24cd),
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
