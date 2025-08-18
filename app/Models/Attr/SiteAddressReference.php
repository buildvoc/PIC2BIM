<?php

namespace App\Models\Attr;

use Illuminate\Database\Eloquent\Model;

class SiteAddressReference extends Model
{
    protected $connection = 'pgsql';
    protected $table = 'lus_fts_site_siteaddressref';
    public $timestamps = false;
    public $incrementing = false; // Composite primary key

    protected $fillable = [
        'uprn',
        'siteid',
        'siteversiondate',
        'relationshiptype',
    ];
}
