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
           'altitude',
            'vertical_view_angle',
            'distance',
            'nmea_distance',
            'accuracy',
            'device_manufacture',
            'device_model',
            'device_platform',
            'device_version',
            'efkLatGpsL1',
            'efkLngGpsL1',
            'efkAltGpsL1',
            'efkTimeGpsL1',
            'efkLatGpsL5',
            'efkLngGpsL5',
            'efkAltGpsL5',
            'efkTimeGpsL5',
            'efkLatGpsIf',
            'efkLngGpsIf',
            'efkAltGpsIf',
            'efkTimeGpsIf',
            'efkLatGalE1',
            'efkLngGalE1',
            'efkAltGalE1',
            'efkTimeGalE1',
            'efkLatGalE5',
            'efkLngGalE5',
            'efkAltGalE5',
            'efkTimeGalE5',
            'efkLatGalIf',
            'efkLngGalIf',
            'efkAltGalIf',
            'efkTimeGalIf',
            'note',
            'lat',
            'lng',
            'photo_heading',
            'created',
            'path',
            'file_name',
            'digest',
            'task_id'
            ]);
        }])
        ->select('id', 'task.status','type_id', 'name', 'text', 'text_returned', 'date_created', 'task_due_date', 'note', 'text_reason')
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
                    'altitude' => $photo->altitude,
                    'vertical_view_angle' => $photo->vertical_view_angle,
                    'distance' => $photo->distance,
                    'nmea_distance' => $photo->nmea_distance,
                    'accuracy' => $photo->accuracy,
                    'device_manufacture' => $photo->device_manufacture,
                    'device_model' => $photo->device_model,
                    'device_platform' => $photo->device_platform,
                    'device_version' => $photo->device_version,
                    'efkLatGpsL1' => $photo->efkLatGpsL1,
                    'efkLngGpsL1' => $photo->efkLngGpsL1,
                    'efkAltGpsL1' => $photo->efkAltGpsL1,
                    'efkTimeGpsL1' => $photo->efkTimeGpsL1,
                    'efkLatGpsL5' => $photo->efkLatGpsL5,
                    'efkLngGpsL5' => $photo->efkLngGpsL5,
                    'efkAltGpsL5' => $photo->efkAltGpsL5,
                    'efkTimeGpsL5' => $photo->efkTimeGpsL5,
                    'efkLatGpsIf' => $photo->efkLatGpsIf,
                    'efkLngGpsIf' => $photo->efkLngGpsIf,
                    'efkAltGpsIf' => $photo->efkAltGpsIf,
                    'efkTimeGpsIf' => $photo->efkTimeGpsIf,
                    'efkLatGalE1' => $photo->efkLatGalE1,
                    'efkLngGalE1' => $photo->efkLngGalE1,
                    'efkAltGalE1' => $photo->efkAltGalE1,
                    'efkTimeGalE1' => $photo->efkTimeGalE1,
                    'efkLatGalE5' => $photo->efkLatGalE5,
                    'efkLngGalE5' => $photo->efkLngGalE5,
                    'efkAltGalE5' => $photo->efkAltGalE5,
                    'efkTimeGalE5' => $photo->efkTimeGalE5,
                    'efkLatGalIf' => $photo->efkLatGalIf,
                    'efkLngGalIf' => $photo->efkLngGalIf,
                    'efkAltGalIf' => $photo->efkAltGalIf,
                    'efkTimeGalIf' => $photo->efkTimeGalIf,
                    'note' => $photo->note,
                    'lat' => $photo->lat,
                    'lng' => $photo->lng,
                    'photo_heading' => $photo->photo_heading,
                    'created' => $photo->created,
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
                'text_returned' => $task->text_returned,
                'date_created' => $task->date_created,
                'task_due_date' => $task->task_due_date,
                'note' => $task->note,
                'number_of_photos' => $task->photos->count(),
                'flag_valid' => $task->flag_valid,
                'flag_invalid' => $task->flag_invalid,
                'reopen_reason' => $task->text_reason,
                'purpose' => $task->taskType->description ?? null,
                'photos' => $photos->toArray() 
            ];
        });
    
        return Inertia::render('Farmers/Index',compact('tasks','token'));
    }


}
