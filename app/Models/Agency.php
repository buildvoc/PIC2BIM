<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agency extends Model
{
    use HasFactory;

    protected $table = 'pa';
    protected $fillable = ['name','timestamp'];
    
    public $timestamps = false;

    public function users(){
        return $this->hasMany(User::class,'pa_id');
    }
}
