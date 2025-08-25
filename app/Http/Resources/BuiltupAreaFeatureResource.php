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
        $geoJson = DB::selectOne("SELECT ST_AsGeoJSON(ST_Transform(geometry, 4326)) as geojson FROM ons_bua WHERE fid = ?", [$this->fid]);

        return [
            'type' => 'Feature',
            'geometry' => $geoJson ? json_decode($geoJson->geojson) : null,
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
