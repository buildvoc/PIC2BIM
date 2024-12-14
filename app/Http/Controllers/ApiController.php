<?php

namespace App\Http\Controllers;

use App\Models\Land;
use App\Models\Path;
use App\Models\Photo;
use App\Models\Task;
use Exception;
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
        

        return response()->json(getShapes($max_lat, $min_lat, $max_lng, $min_lng));
    }

    public function comm_photo(Request $request){
        $task_id = trim($request->input('task_id'));
        $user_id = trim($request->input('user_id'));
        $photo_json = trim($request->input('photo'));
        
        $status_ok = true;
        if ($task_id) {
            $task_status = getTaskStatus($task_id);
            if (!in_array($task_status, ['new', 'open', 'returned'])) {
                $status_ok = false;
            }
        }

        $output = [
            'status' => 'ok',
            'error_msg' => null,
        ];

        if ($photo_json) {
            if ($user_id) {
                if ($status_ok) {
                    $photo = json_decode($photo_json, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $output = setPhoto($photo, $user_id, $task_id);
                    } else {
                        $output['status'] = 'error';
                        $output['error_msg'] = 'photo json decode error';
                    }
                } else {
                    $output['status'] = 'error';
                    $output['error_msg'] = 'task is not in editable status';
                }
            } else {
                $output['status'] = 'error';
                $output['error_msg'] = 'missing user ID';
            }
        }

        if ($output['status'] == 'error') {
            Log::error('Task Photo Error', ['status' => $output['status'], 'error_msg' => $output['error_msg']]);
        }

        return response()->json($output);
    }

    public function comm_get_photo(Request $request){
        $photo_id = trim($request->input('photo_id'));

        $output = [
            'status' => 'ok',
            'error_msg' => null,
            'photo' => getPhoto($photo_id),
        ];

        if (empty($output['photo'])) {
            $output['status'] = 'error';
            $output['error_msg'] = 'wrong photo ID';
            unset($output['photo']);
        }
        
        return response()->json($output);
    }

    public function comm_update(Request $request){
        $task_id = trim($request->input('task_id'));
        $user_id = trim($request->input('user_id'));
        $status = trim($request->input('status'));
        $note = trim($request->input('note'));
        $photos_json = trim($request->input('photos'));

        
        $status_ok = true;
        if ($task_id) {
            $task_status = getTaskStatus($task_id);
            if (!in_array($task_status, ['new', 'open', 'returned'])) {
                $status_ok = false;
            }
        }

        $output = [
            'status' => 'ok',
            'error_msg' => null,
        ];
        if ($photos_json) {
            if ($user_id) {
                if ($status_ok) {
                    $photos = json_decode($photos_json, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $output = setPhotos($photos, $user_id, $task_id);
                    } else {
                        $output['status'] = 'error';
                        $output['error_msg'] = 'photos json decode error';
                    }
                } else {
                    $output['status'] = 'error';
                    $output['error_msg'] = 'task is not in editable status';
                }
            } else {
                $output['status'] = 'error';
                $output['error_msg'] = 'missing user ID';
            }
        }

        if ($output['status'] === 'ok') {
            if ($task_id) {
                $task_status = getTaskStatus($task_id);
                if ($task_status === 'new' && $status === 'open') {
                    $output = setTaskStatus($task_id, $status, $note);
                } elseif (in_array($task_status, ['new', 'open', 'returned']) && $status === 'data provided') {
                    if (checkTaskPhotos($task_id)) { 
                        $output = setTaskStatus($task_id, $status, $note);
                    } else {
                        $output['status'] = 'error';
                        $output['error_msg'] = 'task has no photos';
                    }
                }
            }
        }

        if ($output['status'] === 'error') {
            Log::error('Task Process Error', ['status' => $output['status'], 'error_msg' => $output['error_msg']]);
        }

        return response()->json($output);
    }

    public function comm_task_photos(Request $request){
        $task_id = trim($request->input('task_id'));
        $user_id = trim($request->input('user_id'));
    
        $output = [
            'status' => 'ok',
            'error_msg' => null,
            'photos' => getTaskPhotos($task_id, $user_id),
        ];
    
        return response()->json($output);
    }

    public function comm_delete_path(Request $request){
        $uid = trim($request->input('path_id'));

        $output = [];
        $res = deletePath($uid);

        $output['status'] = $res > 0 ? 'ok' : 'error';
        $output['error_msg'] = $res > 0 ? null : 'Record deleted or record not found';

        return response()->json($output);
    }

    public function comm_delete_unassigned_photo(Request $request){
        $uid = trim($request->input('photo_id'));

        $output = [];

        $res = deleteUnassignedPhoto($uid);

        $output['status'] = $res > 0 ? 'ok' : 'error';
        $output['error_msg'] = $res > 0 ? null : 'Record deleted or record not found';

        return response()->json($output);
    }


    public function comm_get_lpis(Request $request){
        // https://api.os.uk/features/ngd/ofa/v1/collections/bld-fts-buildingpart-2/items?bbox=-0.795704,51.215453,-0.795082,51.215748
        // https://pic2bim.co.uk/comm_get_lpis?max_lat=51.219908&min_lat=51.212019&max_lng=-0.759859&min_lng=-0.781896
        $bbox = explode(",",$request->bbox);
        $requestData = $request->all();
        $max_lng = $bbox[2] ?? false;
        $max_lat = $bbox[3] ?? false;
        $min_lng = $bbox[0] ?? false;
        $min_lat = $bbox[1] ?? false;

        // $max_lat = trim($request->input('max_lat'));
        // $min_lat = trim($request->input('min_lat'));
        // $max_lng = trim($request->input('max_lng'));
        // $min_lng = trim($request->input('min_lng'));

        $numberOfRecords = $requestData['numberOfRecords'] ?? 20;
        $query = Land::whereNotNull('wgs_geometry');
        
        if ($request->has('identificator')) {
            $query->where('identificator', $request->input('identificator'));
        }

        if($max_lat && $min_lat && $max_lng && $min_lng){
            $query
                ->whereRaw('CAST(wgs_min_lat AS DECIMAL) > ?', [$max_lat])
                ->whereRaw('CAST(wgs_max_lat AS DECIMAL) > ?', [$min_lat])
                ->whereRaw('CAST(wgs_min_lng AS DECIMAL) > ?', [$max_lng])
                ->whereRaw('CAST(wgs_max_lng AS DECIMAL) > ?', [$min_lng]);
        }
        
        $lands = $query->limit($numberOfRecords)->get();

        $features = [];
        foreach ($lands as $land){
            $features[] = [
                'id' => $land['id'],
                'type' => 'Feature',
                'geometry' => [
                    'type' => $land['wkt'],
                    'coordinates' => $land['wgs_geometry']
                ],
                'properties' => [
                    'name' => $land['identificator'],
                    'description' => $land['pa_description']
                ]
            ];
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features
        ]);
    }

    public function comm_save_lpis(Request $request){
        try{
            $request->validate([
                'wgs_geometry' => 'required',
                'wgs_max_lat' => 'required',
                'wgs_min_lat' => 'required',
                'wgs_max_lng' => 'required',
                'wgs_min_lng' => 'required'
            ]);
            $requestData = $request->all();
            $land = Land::create([
                'identificator' => $requestData['identificator'] ?? null,
                'pa_description' => $requestData['pa_description'] ?? null,
                'wkt' => $requestData['wkt'] ?? null,
                'wgs_geometry' => $requestData['wgs_geometry'],
                'wgs_max_lat' => $requestData['wgs_max_lat'],
                'wgs_min_lat' => $requestData['wgs_min_lat'],
                'wgs_max_lng' => $requestData['wgs_max_lng'],
                'wgs_min_lng' => $requestData['wgs_min_lng']
            ]);
    
            return response()->json([
                'status' => 'ok',
                'error_msg' => null,
                'lpis_id' => $land['id']
            ]);
        } catch (Exception $e){
            return response()->json([
                'status' => 'error',
                'error_msg' => $e->getMessage(),
            ]);
        }
    }

    public function comm_get_lpis_by_id(Request $request){
        $request->validate([
            'id' => 'required',
        ]);
        $id = $request->id;
        $land = Land::find($id);
        if($land){
            return response()->json([
                'status' => 'ok',
                'error_msg' => null,
                'lpis' => $land
            ]);
        }else {
            return response()->json([
                'status' => 'error',
                'error_msg' => 'Record deleted or record not found'
            ]);
        }
    }
}
