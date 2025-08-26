<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuildingPartSiteRefV2 extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_buildingpart_siteref_v2';
    protected $connection = 'pgsql';
    public $timestamps = false;
    protected $primaryKey = null;
    public $incrementing = false;

    protected $fillable = [
        'buildingpartid',
        'siteid',
        'buildingpartversiondate'
    ];

    public function buildingPart()
    {
        return $this->belongsTo(BuildingPartV2::class, 'buildingpartid', 'osid');
    }

    public function site()
    {
        return $this->belongsTo(Site::class, 'siteid', 'osid');
    }
    
}
