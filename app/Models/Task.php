<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $table = 'task';
    protected $guarded = [];
    public $timestamps = false;

    public const STATUS = array('NEW', 'OPEN', 'DATA PROVIDED', 'DATA CHECKED', 'CLOSED', 'RETURNED');
    public const VALID = 1;
    public const INVALID = 2;
    public const RETURNED = 3;

    public const FILTER_FARMERS = 'user';
    public const FILTER_TASKS = 'task';
    public const FILTER_TASKS_DETAIL = 'task_detail';
    public const FILTER_USERS_GALLERY = 'users_gallery';

    public function photos(){
        return $this->hasMany(Photo::class,'task_id');
    }

    public function taskType(){
        return $this->belongsTo(TaskType::class,'type_id');
    }
}
