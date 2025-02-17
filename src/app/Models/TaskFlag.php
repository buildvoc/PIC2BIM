<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskFlag extends Model
{
    use HasFactory;
    protected $table = 'task_flag';
    protected $guarded = [];
    public $timestamps = false;
}
