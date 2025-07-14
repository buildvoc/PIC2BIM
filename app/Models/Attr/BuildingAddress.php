<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuildingAddress extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_building_bldtoaddrcrossref';
    protected $connection = 'pgsql';
    public $timestamps = false;
    protected $primaryKey = null;
    public $incrementing = false;

    protected $fillable = [
        'uprn',
        'buildingid',
        'buildingversiondate'
    ];

    public function uprn()
    {
        return $this->belongsTo(Uprn::class, 'uprn', 'uprn');
    }

    public function building()
    {
        return $this->belongsTo(Building::class, 'buildingid', 'osid');
    }
}
