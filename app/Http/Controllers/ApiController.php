<?php

namespace App\Http\Controllers;

use App\Models\Path;
use App\Models\Photo;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use PDO;

class ApiController extends Controller
{
    public function comm_get_paths(Request $request){

        $user_id = $request->user_id;

        $paths = Path::where('flg_deleted', 0)
                 ->where('user_id', $user_id)
                 ->with('points')
                 ->get();

        $output = $paths->map(function ($path) {
            return [
                'id' => $path->id,
                'name' => $path->name,
                'start' => $path->start,
                'end' => $path->end,
                'area' => $path->area,
                'device_manufacture' => $path->device_manufacture,
                'device_model' => $path->device_model,
                'device_platform' => $path->device_platform,
                'device_version' => $path->device_version,
                'points' => $path->points->map(function ($point) {
                    return [
                        'id' => $point->id,
                        'lat' => $point->lat,
                        'lng' => $point->lng,
                        'altitude' => $point->altitude,
                        'accuracy' => $point->accuracy,
                        'created' => $point->created,
                    ];
                }),
            ];
        });

        $output = $output->toArray(); 

        return response()->json([
            'status'=>'ok',
            'error_msg' => null,
            'paths' => $output
        ]);
    }

    public function comm_unassigned(Request $request){
        $user_id = $request->user_id;

        $ids = Photo::where('user_id',$user_id)->where('flg_deleted',0)->whereNull('task_id')->pluck('id')->toArray();

        $output = [];
        $output['status'] = 'ok';
        $output['error_msg'] = NULL;
        $output['photos_ids'] = $ids;

        return response()->json($output);
    }

    public function comm_tasks(Request $request){
        $user_id = $request->user_id;
        
        
        $tasks = Task::withCount(['photos' => function ($query) {
            $query->where('flg_deleted', 0);
        }])
        ->with(['taskType' => function ($query) {
            $query->select('id', 'description');
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
                'photos_ids' => $task->photos->pluck('id')->toArray(),
            ];
        });
        $output = [];
        $output['status'] = 'ok';
        $output['error_msg'] = NULL;
        $output['tasks'] = $tasks;
        return response()->json($output);
    }

    public function comm_status(Request $request){

        $task_id = trim($request->task_id);
        $status = trim($request->status);
        $note = trim($request->note);
        $output = array(); 
        $output['status'] = 'ok';
        $output['error_msg'] = NULL; 

        if($task_id){
            $task_status = Task::select('id','status')->where('id',$task_id)->first();
            $task_status = $task_status ? $task_status->status : '';

            if($task_status == 'new' && $status == 'open'){
                $output = Task::setTaskStatus($task_id, $status, $note);
            }elseif (($task_status == 'new' || $task_status == 'open' || $task_status == 'returned') && $status == 'data provided') {
                if(Task::checkTaskPhotos($task_id)){
                    $output = Task::setTaskStatus($task_id, $status, $note);
                }else{
                    $output['status'] = 'error';
                    $output['error_msg'] = 'task has no photos';
                }
            }
        }
        return response()->json($output);
    }

    public function comm_path(Request $request){
        $user_id = $request->input('user_id');
        $name = $request->input('name');
        $device_manufacture = $request->input('deviceManufacture');
        $device_model = $request->input('deviceModel');
        $device_platform = $request->input('devicePlatform');
        $device_version = $request->input('deviceVersion');
        $area = $request->input('area');
        $points_json = $request->input('points');
        
        $start = gmdate('Y-m-d H:i:s', strtotime($request->input('start')));
        $end = gmdate('Y-m-d H:i:s', strtotime($request->input('end')));

        $output = [
            'status' => 'ok',
            'error_msg' => null
        ];

        if ($user_id && $start && $end && $points_json) {
            $points = json_decode($points_json, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                $output = setPath($user_id, $name, $start, $end, $area, $device_manufacture, $device_model, $device_platform, $device_version, $points);
            } else {
                $output['status'] = 'error';
                $output['error_msg'] = 'Points JSON decode error';
            }
        } else {
            $output['status'] = 'error';
            $output['error_msg'] = 'Missing mandatory data';
        }

        if ($output['status'] === 'error') {
            Log::error('Request error', ['status' => $output['status'], 'error_msg' => $output['error_msg']]);
        }

        return response()->json($output);
 
    }

    public function comm_shapes(Request $request){
        $max_lat = trim($request->input('max_lat'));
        $min_lat = trim($request->input('min_lat'));
        $max_lng = trim($request->input('max_lng'));
        $min_lng = trim($request->input('min_lng'));

        $output = [
            'status' => 'ok',
            'error_msg' => null,
            'shapes' => getShapes($max_lat, $min_lat, $max_lng, $min_lng),
        ];

        return response()->json($output);
    }
}
