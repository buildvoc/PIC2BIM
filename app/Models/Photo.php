<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Photo extends Model
{
    use HasFactory;
    protected $table = 'photo';
    protected $guarded = [];

    public $timestamps = false;


    protected function lat(): Attribute
    {
        return Attribute::make(
            get: fn (string $value) => rtrim($value,0),
        );
    }
    
}
