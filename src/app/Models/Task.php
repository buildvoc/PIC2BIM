<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $table = 'task';
    protected $guarded = [];
    public $timestamps = false;

    public const STATUS = array('new', 'open', 'data provided', 'data checked', 'closed', 'returned');
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
    public static function setTaskStatus($task_id, $status, $note){
        $task = Task::find($task_id);
        $task->update([
            'status' => $status,
            'note' => $note ? $note : null,
            'timestamp' => Carbon::now()->format("Y-m-d H:i:s")
        ]);
        return ['status' => 'ok','error_msg' => NULL];
    }

    public static function checkTaskPhotos($task_id){
        $photo_count = Photo::where('task_id',$task_id)->count();
        return $photo_count > 0 ? true : false;
    }
}
