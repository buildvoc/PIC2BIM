<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

 class UserTaskController extends Controller
{
    public function index(Request $request)
    {   
        $token = env('NEXT_PUBLIC_MAPBOX_TOKEN');
        $user = Auth::user();
        $user_id = $user->id;
        $tasks = Task::withCount(['photos' => function ($query) {
            $query->where('flg_deleted', 0);
        }])
        ->with(['taskType:id,description','photos'  => function ($query) {
            $query->where('flg_deleted', 0)
            ->select([
            'lat',
            'lng',
            'photo_heading',
            'path',
            'file_name',
            'digest',
            'task_id'
            ]);
        }])
        ->select('id', 'task.status','type_id', 'name', 'text', 'date_created', 'task_due_date'  )
        ->selectRaw('IF((SELECT COUNT(*) FROM task_flag tf WHERE task_id = task.id AND flag_id = 1) > 0, "1", "0") AS flag_valid')
        ->selectRaw('IF((SELECT COUNT(*) FROM task_flag tf WHERE task_id = task.id AND flag_id = 2) > 0, "1", "0") AS flag_invalid')
        ->where('user_id', $user_id)
        ->where('flg_deleted', 0)
        ->leftJoin('status_sortorder', 'task.status', '=', 'status_sortorder.status')
        ->orderBy('status_sortorder.sortorder')
        ->get()
        ->map(function ($task) {
            $photos = $task->photos->map(function ($photo) {
                $filePath = storage_path('app/private/'.$photo->path . $photo->file_name);
                $file = null;
                if (file_exists($filePath)) {
                    $file = file_get_contents($filePath);
                }
                return [
                    'lat' => $photo->lat,
                    'lng' => $photo->lng,
                    'photo_heading' => $photo->photo_heading,
                    'path' => $photo->path,
                    'file_name' => $photo->file_name,
                    'digest' => $photo->digest,
                    'photo' => $file ? base64_encode($file) : null,
                ];
            });

            return [
                'id' => $task->id,
                'status' => $task->status,
                'name' => $task->name,
                'text' => $task->text,
                'date_created' => $task->date_created,
                'task_due_date' => $task->task_due_date,
                'number_of_photos' => $task->photos->count(),
                'flag_valid' => $task->flag_valid,
                'photos' => $photos->toArray() 
            ];
        });
    
        return Inertia::render('Farmers/Index',compact('tasks','token'));
    }


}
