<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BuildingSiteLink extends Model
{
    use HasFactory;

    protected $table = 'bld_fts_building_bldtostecrossref';
    protected $connection = 'pgsql';
    public $timestamps = false;
    protected $primaryKey = null;
    public $incrementing = false;

    protected $fillable = [
        'buildingid',
        'siteid',
        'buildingversiondate'
    ];
}
