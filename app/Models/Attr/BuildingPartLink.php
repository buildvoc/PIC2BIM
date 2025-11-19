<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuildingPartLink extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_building_bldtobldprtcrossref';
    protected $connection = 'pgsql';
    public $timestamps = false;
    protected $primaryKey = null;
    public $incrementing = false;

    protected $fillable = [
        'buildingid',
        'buildingpartid',
        'buildingversiondate'
    ];

    public function building()
    {
        return $this->belongsTo(Building::class, 'buildingid', 'osid');
    }

    public function buildingPart()
    {
        return $this->belongsTo(BuildingPart::class, 'buildingpartid', 'osid');
    }
    
}
