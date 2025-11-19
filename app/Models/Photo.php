<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Photo extends Model
{
    use HasFactory;
    protected $table = 'photo';
    protected $guarded = [];

    public $appends = ['link'];

    public $timestamps = false;


    protected function lat(): Attribute
    {
        return Attribute::make(
            get: fn (string $value) => rtrim($value,0),
        );
    }

    public function user(){
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function getLinkAttribute(){
        return asset(Storage::url($this->path.$this->file_name));
    }
    
}
