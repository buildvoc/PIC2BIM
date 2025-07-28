<?php

namespace App\Http\Controllers;

use PDO;
use Exception;
use App\Models\Land;
use App\Models\NHLE;
use App\Models\Path;
use App\Models\Task;
use App\Models\Photo;
use App\Models\Attr\Uprn;
use App\Models\Attr\Shape;
use Illuminate\Http\Request;
use App\Models\Attr\Codepoint;
use App\Models\Attr\BuildingPart;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\UprnCollection;
use App\Http\Resources\ShapeCollection;
use App\Http\Resources\CodepointCollection;
use App\Http\Resources\NhleCollection;
use App\Models\LandRegistryInspire;
use App\Http\Resources\LandRegistryInspireCollection;

class ApiController extends Controller
{
    /**
     * @OA\Post(
     *     path="/comm_get_paths",
     *     summary="Get user paths",
     *     description="Retrieve all paths for a specific user with their associated points",
     *     tags={"Paths"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"user_id"},
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user to get paths for",
     *                     example=4
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful response with user paths",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_msg",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             ),
     *             @OA\Property(
     *                 property="paths",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="Morning Walk"),
     *                     @OA\Property(property="start", type="string", format="date-time", example="2024-05-01 12:00:00"),
     *                     @OA\Property(property="end", type="string", format="date-time", example="2024-05-01 13:00:00"),
     *                     @OA\Property(property="area", type="number", format="float", example=150.50),
     *                     @OA\Property(property="device_manufacture", type="string", example="Apple"),
     *                     @OA\Property(property="device_model", type="string", example="iPhone 14"),
     *                     @OA\Property(property="device_platform", type="string", example="iOS"),
     *                     @OA\Property(property="device_version", type="string", example="17.0"),
     *                     @OA\Property(
     *                         property="points",
     *                         type="array",
     *                         @OA\Items(
     *                             type="object",
     *                             @OA\Property(property="id", type="integer", example=1),
     *                             @OA\Property(property="lat", type="number", format="double", example=51.5074),
     *                             @OA\Property(property="lng", type="number", format="double", example=-0.1278),
     *                             @OA\Property(property="altitude", type="number", format="double", example=35.5),
     *                             @OA\Property(property="accuracy", type="number", format="double", example=5.0),
     *                             @OA\Property(property="created", type="string", format="date-time", example="2024-05-01T12:00:00Z")
     *                         )
     *                     )
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Missing or invalid user_id"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error"
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_unassigned",
     *     summary="Get unassigned photo IDs by user ID",
     *     description="Retrieve all photo IDs that belong to a user but are not assigned to any task",
     *     tags={"Photos"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"user_id"},
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user to get unassigned photos for",
     *                     example=4
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful response with unassigned photo IDs",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_msg",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             ),
     *             @OA\Property(
     *                 property="photos_ids",
     *                 type="array",
     *                 description="Array of photo IDs that are not assigned to any task",
     *                 @OA\Items(
     *                     type="integer",
     *                     example=18021
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Missing or invalid user_id"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     * 
     *         description="Internal server error"
     *     )
     * )
     */
    public function comm_unassigned(Request $request){
        $user_id = $request->user_id;

        $ids = Photo::where('user_id',$user_id)->where('flg_deleted',0)->whereNull('task_id')->pluck('id')->toArray();

        $output = [];
        $output['status'] = 'ok';
        $output['error_msg'] = NULL;
        $output['photos_ids'] = $ids;

        return response()->json($output);
    }

    /**
     * @OA\Post(
     *     path="/comm_tasks",
     *     summary="Get tasks by user ID",
     *     description="Retrieve all tasks assigned to a specific user with their details, photos count, and flags",
     *     tags={"Tasks"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"user_id"},
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user to get tasks for",
     *                     example=3
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful response with user tasks",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_msg",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             ),
     *             @OA\Property(
     *                 property="tasks",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=125950),
     *                     @OA\Property(property="status", type="string", example="new"),
     *                     @OA\Property(property="name", type="string", example="Survey Building A"),
     *                     @OA\Property(property="text", type="string", example="Please survey the building and take photos"),
     *                     @OA\Property(property="text_returned", type="string", nullable=true, example=null),
     *                     @OA\Property(property="date_created", type="string", format="date-time", example="2024-01-15T10:30:00Z"),
     *                     @OA\Property(property="task_due_date", type="string", format="date-time", example="2024-01-20T17:00:00Z"),
     *                     @OA\Property(property="note", type="string", nullable=true, example="Urgent task"),
     *                     @OA\Property(property="number_of_photos", type="integer", example=5),
     *                     @OA\Property(property="flag_valid", type="string", example="1"),
     *                     @OA\Property(property="flag_invalid", type="string", example="0"),
     *                     @OA\Property(property="reopen_reason", type="string", nullable=true, example="Photos unclear"),
     *                     @OA\Property(property="purpose", type="string", example="Building Survey"),
     *                     @OA\Property(
     *                         property="photos_ids",
     *                         type="array",
     *                         @OA\Items(type="integer", example=18021)
     *                     )
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Missing or invalid user_id"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error"
     *     )
     * )
     */
    public function comm_tasks(Request $request){
        $user_id = $request->user_id;
        
        
        $tasks = Task::withCount(['photos' => function ($query) {
            $query->where('flg_deleted', 0);
        }])
        ->with(['taskType' => function ($query) {
            $query->select('id', 'description');
        }])
        ->select('id', 'task.status','type_id', 'name', 'text', 'text_returned', 'date_created', 'task_due_date', 'note', 'text_reason')
        ->selectRaw('CASE WHEN (SELECT COUNT(*) FROM task_flag tf WHERE task_id = task.id AND flag_id = 1) > 0 THEN 1 ELSE 0 END AS flag_valid')
        ->selectRaw('CASE WHEN (SELECT COUNT(*) FROM task_flag tf WHERE task_id = task.id AND flag_id = 2) > 0 THEN 1 ELSE 0 END AS flag_invalid')
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
                'flag_valid' => (string) $task->flag_valid,
                'flag_invalid' => (string) $task->flag_invalid,
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

    /**
     * @OA\Post(
     *     path="/comm_status",
     *     summary="Update task status",
     *     description="Update the status of a task with optional note. Valid status transitions: new->open, new/open/returned->data provided",
     *     tags={"Tasks"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"task_id", "status"},
     *                 @OA\Property(
     *                     property="task_id",
     *                     type="integer",
     *                     description="ID of the task to update",
     *                     example=123
     *                 ),
     *                 @OA\Property(
     *                     property="status",
     *                     type="string",
     *                     description="New status for the task",
     *                     example="new",
     *                     enum={"new", "open", "data provided"}
     *                 ),
     *                 @OA\Property(
     *                     property="note",
     *                     type="string",
     *                     description="Optional note for the status change",
     *                     example="test",
     *                     nullable=true
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful status update",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_msg",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Invalid status transition or missing required fields"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error"
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_path",
     *     summary="Create a new path",
     *     description="Create a new path with GPS coordinates, device information, and timing data",
     *     tags={"Paths"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"user_id", "start", "end", "points"},
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user creating the path",
     *                     example=3
     *                 ),
     *                 @OA\Property(
     *                     property="name",
     *                     type="string",
     *                     description="Name of the path",
     *                     example="Test example path",
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="deviceManufacture",
     *                     type="string",
     *                     description="Device manufacturer",
     *                     example="Manufacturer",
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="deviceModel",
     *                     type="string",
     *                     description="Device model",
     *                     example="Model",
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="devicePlatform",
     *                     type="string",
     *                     description="Device platform (iOS, Android, etc.)",
     *                     example="Platform",
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="deviceVersion",
     *                     type="string",
     *                     description="Device version",
     *                     example="Version",
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="start",
     *                     type="string",
     *                     format="date-time",
     *                     description="Start time of the path",
     *                     example="2024-05-01 12:00:00"
     *                 ),
     *                 @OA\Property(
     *                     property="end",
     *                     type="string",
     *                     format="date-time",
     *                     description="End time of the path",
     *                     example="2024-05-01 13:00:00"
     *                 ),
     *                 @OA\Property(
     *                     property="area",
     *                     type="number",
     *                     format="float",
     *                     description="Area covered by the path",
     *                     example=150.50,
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="points",
     *                     type="string",
     *                     description="JSON string containing GPS coordinates and metadata"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Path created successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_msg",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Missing mandatory data or invalid JSON in points"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error"
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_photo",
     *     summary="Upload a photo",
     *     description="Upload a photo with metadata and assign it to a task. Task must be in editable status (new, open, or returned)",
     *     tags={"Photos"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"user_id", "photo"},
     *                 @OA\Property(
     *                     property="task_id",
     *                     type="integer",
     *                     description="ID of the task to assign the photo to",
     *                     example=125950,
     *                     nullable=true
     *                 ),
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user uploading the photo",
     *                     example=4
     *                 ),
     *                 @OA\Property(
     *                     property="photo",
     *                     type="string",
     *                     description="JSON string containing photo metadata and base64 image data"
     *                 ),
     *                 @OA\Property(
     *                     property="digest",
     *                     type="string",
     *                     description="Digest value for photo verification",
     *                     example="abc123digestvalue",
     *                     nullable=true
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Photo uploaded successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_msg",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Missing user ID, invalid photo JSON, or task not in editable status"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error"
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_get_photo",
     *     summary="Get photo by ID",
     *     description="Retrieve a photo by its ID with all associated metadata",
     *     tags={"Photos"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"photo_id"},
     *                 @OA\Property(
     *                     property="photo_id",
     *                     type="integer",
     *                     description="ID of the photo to retrieve",
     *                     example=18021
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         description="Accept header for response format",
     *         @OA\Schema(type="string"),
     *         example="application/json"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Photo retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="photo",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=18021),
     *                 @OA\Property(property="user_id", type="integer", example=4),
     *                 @OA\Property(property="task_id", type="integer", example=123),
     *                 @OA\Property(property="lat", type="string", example="34.052235"),
     *                 @OA\Property(property="lng", type="string", example="-118.243683"),
     *                 @OA\Property(property="altitude", type="string", example="89.5"),
     *                 @OA\Property(property="bearing", type="string", example="120"),
     *                 @OA\Property(property="magnetic_azimuth", type="string", example="180"),
     *                 @OA\Property(property="photo_heading", type="string", example="45"),
     *                 @OA\Property(property="accuracy", type="string", example="5"),
     *                 @OA\Property(property="orientation", type="string", example="123"),
     *                 @OA\Property(property="pitch", type="string", example="10"),
     *                 @OA\Property(property="roll", type="string", example="5"),
     *                 @OA\Property(property="photo_angle", type="string", example="90"),
     *                 @OA\Property(property="created", type="string", example="2024-10-17 10:00:00"),
     *                 @OA\Property(property="note", type="string", example="This is a sample note"),
     *                 @OA\Property(property="photo", type="string", example="base64_image_data")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Photo not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Photo not found")
     *         )
     *     )
     * )
     */
    public function comm_get_photo(Request $request){
        $photo_id = trim($request->input('photo_id'));

        $output = [
            'status' => 'ok',
            'error_msg' => null,
            'photo' => getPhoto($photo_id, true),
        ];

        if (empty($output['photo'])) {
            $output['status'] = 'error';
            $output['error_msg'] = 'wrong photo ID';
            unset($output['photo']);
        }
        
        return response()->json($output);
    }

    /**
     * @OA\Post(
     *     path="/comm_update",
     *     summary="Submit task photos and update task status",
     *     description="Submit multiple photos for a task and update the task status to 'data provided'",
     *     tags={"Tasks"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"user_id", "task_id", "photos", "status"},
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user submitting the photos",
     *                     example=4
     *                 ),
     *                 @OA\Property(
     *                     property="task_id",
     *                     type="integer",
     *                     description="ID of the task to update",
     *                     example=125950
     *                 ),
     *                 @OA\Property(
     *                     property="photos",
     *                     type="string",
     *                     description="JSON array of photo objects with metadata and base64 image data"
     *                 ),
     *                 @OA\Property(
     *                     property="status",
     *                     type="string",
     *                     description="New status for the task (typically 'data provided')",
     *                     example="data provided"
     *                 ),
     *                 @OA\Property(
     *                     property="note",
     *                     type="string",
     *                     description="Optional note for the task",
     *                     example="TEST TASK NOTE"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Task updated successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="Task updated successfully"
     *             ),
     *             @OA\Property(
     *                 property="photos_count",
     *                 type="integer",
     *                 example=3
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid request or task not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Task not found or invalid status")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Validation failed"),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="task_id", type="array", @OA\Items(type="string", example="Task ID is required"))
     *             )
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_task_photos",
     *     summary="Get task photos",
     *     description="Retrieve all photos associated with a specific task",
     *     tags={"Tasks"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"task_id", "user_id"},
     *                 @OA\Property(
     *                     property="task_id",
     *                     type="integer",
     *                     description="ID of the task to get photos for",
     *                     example=125950
     *                 ),
     *                 @OA\Property(
     *                     property="user_id",
     *                     type="integer",
     *                     description="ID of the user requesting the photos",
     *                     example=4
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Task photos retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="photos",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=18021),
     *                     @OA\Property(property="user_id", type="integer", example=4),
     *                     @OA\Property(property="task_id", type="integer", example=125950),
     *                     @OA\Property(property="lat", type="string", example="34.052235"),
     *                     @OA\Property(property="lng", type="string", example="-118.243683"),
     *                     @OA\Property(property="altitude", type="string", example="89.5"),
     *                     @OA\Property(property="bearing", type="string", example="120"),
     *                     @OA\Property(property="magnetic_azimuth", type="string", example="180"),
     *                     @OA\Property(property="photo_heading", type="string", example="45"),
     *                     @OA\Property(property="accuracy", type="string", example="5"),
     *                     @OA\Property(property="orientation", type="string", example="123"),
     *                     @OA\Property(property="pitch", type="string", example="10"),
     *                     @OA\Property(property="roll", type="string", example="5"),
     *                     @OA\Property(property="photo_angle", type="string", example="90"),
     *                     @OA\Property(property="created", type="string", example="2024-10-17 10:00:00"),
     *                     @OA\Property(property="note", type="string", example="This is a sample note"),
     *                     @OA\Property(property="photo", type="string", example="base64_image_data")
     *                 )
     *             ),
     *             @OA\Property(
     *                 property="total_photos",
     *                 type="integer",
     *                 example=3
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Task not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Task not found")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Access denied",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Access denied to this task")
     *         )
     *     )
     * )
     */
    public function comm_task_photos(Request $request){
        $task_id = trim($request->input('task_id'));
        $user_id = trim($request->input('user_id'));
    
        $output = [
            'status' => 'ok',
            'error_msg' => null,
            'photos' => getTaskPhotos($task_id, $user_id, true),
        ];
    
        return response()->json($output);
    }

    
    /**
     * @OA\Post(
     *     path="/comm_delete_path",
     *     summary="Delete a path",
     *     description="Delete a specific path and all its associated points",
     *     tags={"Paths"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"path_id"},
     *                 @OA\Property(
     *                     property="path_id",
     *                     type="integer",
     *                     description="ID of the path to delete",
     *                     example=373
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Path deleted successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="Path deleted successfully"
     *             ),
     *             @OA\Property(
     *                 property="deleted_path_id",
     *                 type="integer",
     *                 example=373
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Path not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Path not found")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Access denied",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Access denied to delete this path")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Failed to delete path")
     *         )
     *     )
     * )
     */
    public function comm_delete_path(Request $request){
        $uid = trim($request->input('path_id'));

        $output = [];
        $res = deletePath($uid);

        $output['status'] = $res > 0 ? 'ok' : 'error';
        $output['error_msg'] = $res > 0 ? null : 'Record deleted or record not found';

        return response()->json($output);
    }

    
    /**
     * @OA\Post(
     *     path="/comm_delete_unassigned_photo",
     *     summary="Delete unassigned photo",
     *     description="Delete a photo that is not assigned to any task",
     *     tags={"Photos"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"photo_id"},
     *                 @OA\Property(
     *                     property="photo_id",
     *                     type="integer",
     *                     description="ID of the unassigned photo to delete",
     *                     example=17804
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Photo deleted successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="Photo deleted successfully"
     *             ),
     *             @OA\Property(
     *                 property="deleted_photo_id",
     *                 type="integer",
     *                 example=17804
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Photo not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Photo not found")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Photo is assigned to a task",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Cannot delete photo that is assigned to a task")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Access denied",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Access denied to delete this photo")
     *         )
     *     )
     * )
     */
    public function comm_delete_unassigned_photo(Request $request){
        $uid = trim($request->input('photo_id'));

        $output = [];

        $res = deleteUnassignedPhoto($uid);

        $output['status'] = $res > 0 ? 'ok' : 'error';
        $output['error_msg'] = $res > 0 ? null : 'Record deleted or record not found';

        return response()->json($output);
    }


    /**
     * @OA\Get(
     *     path="/comm_get_lpis",
     *     summary="Retrieve a list of LPIS records based on filters or bounding box",
     *     description="Get LPIS (Land Parcel Identification System) records using bounding box coordinates or other filters",
     *     tags={"LPIS"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         description="Specifies the content type",
     *         @OA\Schema(type="string"),
     *         example="application/json"
     *     ),
     *     @OA\Parameter(
     *         name="bbox",
     *         in="query",
     *         required=false,
     *         description="Bounding box coordinates in format: min_lng,min_lat,max_lng,max_lat",
     *         @OA\Schema(type="string"),
     *         example="-0.6000,51.2000,-0.5900,51.2100"
     *     ),
     *     @OA\Parameter(
     *         name="numberOfRecords",
     *         in="query",
     *         required=false,
     *         description="Number of records per page for pagination",
     *         @OA\Schema(type="integer", default=20),
     *         example=20
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="LPIS records retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="records",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="parcel_id", type="string", example="GB123456789"),
     *                     @OA\Property(property="area_ha", type="number", format="float", example=2.5),
     *                     @OA\Property(property="land_use", type="string", example="Arable"),
     *                     @OA\Property(property="geometry", type="string", example="POLYGON((-0.6 51.2, -0.59 51.2, -0.59 51.21, -0.6 51.21, -0.6 51.2))"),
     *                     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00Z"),
     *                     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-01T00:00:00Z")
     *                 )
     *             ),
     *             @OA\Property(
     *                 property="total_records",
     *                 type="integer",
     *                 example=150
     *             ),
     *             @OA\Property(
     *                 property="current_page",
     *                 type="integer",
     *                 example=1
     *             ),
     *             @OA\Property(
     *                 property="records_per_page",
     *                 type="integer",
     *                 example=20
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid bounding box format",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Invalid bounding box format")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Validation failed"),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="bbox", type="array", @OA\Items(type="string", example="Bounding box must be in correct format"))
     *             )
     *         )
     *     )
     * )
     */
    public function comm_get_lpis(Request $request){
        
        $bbox = explode(",",$request->bbox);
        $requestData = $request->all();
        $max_lng = $bbox[2] ?? false;
        $max_lat = $bbox[3] ?? false;
        $min_lng = $bbox[0] ?? false;
        $min_lat = $bbox[1] ?? false;

        $numberOfRecords = $requestData['numberOfRecords'] ?? 20;
        $query = Land::select('id', 'identificator', 'pa_description', 'wkt', 'wgs_max_lat', 'wgs_min_lat', 'wgs_max_lng', 'wgs_min_lng')
            ->selectRaw("ST_AsGeoJSON(wgs_geometry) as geometry_json")
            ->whereNotNull('wgs_geometry');
        
        if ($request->has('identificator')) {
            $query->where('identificator', $request->input('identificator'));
        }

        if($max_lat && $min_lat && $max_lng && $min_lng){
            $query
                ->where('wgs_min_lat', '<', $max_lat)
                ->where('wgs_max_lat', '>', $min_lat)
                ->where('wgs_min_lng', '<', $max_lng)
                ->where('wgs_max_lng', '>', $min_lng);
        }
        
        $lands = $query->limit($numberOfRecords)->get();

        $features = [];
        foreach ($lands as $land){
            $geometryJson = json_decode($land->geometry_json, true);
            
            $features[] = [
                'id' => $land->id,
                'type' => 'Feature',
                'geometry' => $geometryJson ?? [
                    'type' => $land->wkt,
                    'coordinates' => null
                ],
                'properties' => [
                    'name' => $land->identificator,
                    'description' => $land->pa_description
                ]
            ];
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => $features
        ]);
    }

    /**
     * @OA\Post(
     *     path="/comm_lpis",
     *     summary="Save LPIS",
     *     description="Save a new LPIS (Land Parcel Identification System) record with geometry and metadata",
     *     tags={"LPIS"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"identificator", "wgs_geometry", "wgs_max_lat", "wgs_min_lat", "wgs_max_lng", "wgs_min_lng"},
     *                 @OA\Property(
     *                     property="identificator",
     *                     type="string",
     *                     description="Unique identifier for the LPIS record",
     *                     example="identificator"
     *                 ),
     *                 @OA\Property(
     *                     property="pa_description",
     *                     type="string",
     *                     description="Description of the parcel area",
     *                     example="pa description"
     *                 ),
     *                 @OA\Property(
     *                     property="wkt",
     *                     type="string",
     *                     description="Well-Known Text representation of the geometry",
     *                     example="wkt data"
     *                 ),
     *                 @OA\Property(
     *                     property="wgs_geometry",
     *                     type="string",
     *                     description="JSON array of coordinate objects with latitude and longitude"
     *                 ),
     *                 @OA\Property(
     *                     property="wgs_max_lat",
     *                     type="number",
     *                     format="float",
     *                     description="Maximum latitude of the bounding box",
     *                     example=21.22
     *                 ),
     *                 @OA\Property(
     *                     property="wgs_min_lat",
     *                     type="number",
     *                     format="float",
     *                     description="Minimum latitude of the bounding box",
     *                     example=-98.32
     *                 ),
     *                 @OA\Property(
     *                     property="wgs_max_lng",
     *                     type="number",
     *                     format="float",
     *                     description="Maximum longitude of the bounding box",
     *                     example=3.21
     *                 ),
     *                 @OA\Property(
     *                     property="wgs_min_lng",
     *                     type="number",
     *                     format="float",
     *                     description="Minimum longitude of the bounding box",
     *                     example=12.01
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         description="Accept header for response format",
     *         @OA\Schema(type="string"),
     *         example="application/json"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="LPIS record saved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="message",
     *                 type="string",
     *                 example="LPIS record saved successfully"
     *             ),
     *             @OA\Property(
     *                 property="lpis_id",
     *                 type="integer",
     *                 example=123
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Validation failed"),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="identificator", type="array", @OA\Items(type="string", example="Identificator is required")),
     *                 @OA\Property(property="wgs_geometry", type="array", @OA\Items(type="string", example="Invalid geometry format"))
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Failed to save LPIS record")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_get_lpis_record",
     *     summary="Get a single LPIS record",
     *     description="Retrieve a specific LPIS record by its ID",
     *     tags={"LPIS"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"id"},
     *                 @OA\Property(
     *                     property="id",
     *                     type="integer",
     *                     description="ID of the LPIS record to retrieve",
     *                     example=627847
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         description="Accept header for response format",
     *         @OA\Schema(type="string"),
     *         example="application/json"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="LPIS record retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="record",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=627847),
     *                 @OA\Property(property="identificator", type="string", example="GB123456789"),
     *                 @OA\Property(property="pa_description", type="string", example="Agricultural land parcel"),
     *                 @OA\Property(property="wkt", type="string", example="POLYGON((-0.6 51.2, -0.59 51.2, -0.59 51.21, -0.6 51.21, -0.6 51.2))"),
     *                 @OA\Property(property="wgs_geometry", type="string", description="JSON array of coordinate objects"),
     *                 @OA\Property(property="wgs_max_lat", type="number", format="float", example=51.21),
     *                 @OA\Property(property="wgs_min_lat", type="number", format="float", example=51.2),
     *                 @OA\Property(property="wgs_max_lng", type="number", format="float", example=-0.59),
     *                 @OA\Property(property="wgs_min_lng", type="number", format="float", example=-0.6),
     *                 @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00Z"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-01T00:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="LPIS record not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="LPIS record not found")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Validation failed"),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="id", type="array", @OA\Items(type="string", example="ID is required"))
     *             )
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/comm_shapes",
     *     summary="Get shapes by coordinates",
     *     description="Retrieve shapes based on bounding box coordinates",
     *     tags={"Shapes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"max_lat", "min_lat", "max_lng", "min_lng"},
     *                 @OA\Property(
     *                     property="max_lat",
     *                     type="number",
     *                     format="float",
     *                     description="Maximum latitude of the bounding box",
     *                     example=51.21
     *                 ),
     *                 @OA\Property(
     *                     property="min_lat",
     *                     type="number",
     *                     format="float",
     *                     description="Minimum latitude of the bounding box",
     *                     example=51.2
     *                 ),
     *                 @OA\Property(
     *                     property="max_lng",
     *                     type="number",
     *                     format="float",
     *                     description="Maximum longitude of the bounding box",
     *                     example=-0.59
     *                 ),
     *                 @OA\Property(
     *                     property="min_lng",
     *                     type="number",
     *                     format="float",
     *                     description="Minimum longitude of the bounding box",
     *                     example=-0.6
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         description="Accept header for response format",
     *         @OA\Schema(type="string"),
     *         example="application/json"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Shapes retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="success",
     *                 type="boolean",
     *                 example=true
     *             ),
     *             @OA\Property(
     *                 property="shapes",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="shape_type", type="string", example="polygon"),
     *                     @OA\Property(property="geometry", type="string", example="POLYGON((-0.6 51.2, -0.59 51.2, -0.59 51.21, -0.6 51.21, -0.6 51.2))"),
     *                     @OA\Property(property="properties", type="string", description="JSON object containing shape properties"),
     *                     @OA\Property(property="created_at", type="string", format="date-time", example="2024-01-01T00:00:00Z"),
     *                     @OA\Property(property="updated_at", type="string", format="date-time", example="2024-01-01T00:00:00Z")
     *                 )
     *             ),
     *             @OA\Property(
     *                 property="total_shapes",
     *                 type="integer",
     *                 example=5
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid coordinates",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Invalid coordinate values")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Validation failed"),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="max_lat", type="array", @OA\Items(type="string", example="Maximum latitude is required"))
     *             )
     *         )
     *     )
     * )
     */
    public function comm_shapes(Request $request){
        $maxEasting = $request->max_lng;
        $maxNorthing = $request->max_lat;
        $minEasting = $request->min_lng;
        $minNorthing = $request->min_lat;

        $data = Shape::query()
        ->when($minEasting, function ($query) use ($minEasting, $minNorthing,$maxEasting, $maxNorthing) {
            $query->whereRaw("wkb_geometry && ST_Transform(ST_MakeEnvelope($minEasting, $minNorthing,$maxEasting, $maxNorthing, 4326), 27700)");
        })
        ->get();

        return new ShapeCollection($data);
    }

    /**
     * @OA\Get(
     * path="/comm_building_part",
     * security={{"bearerAuth":{}}},
     * tags={"Building Part"},
     * @OA\Response(response=200, description="List of building part", @OA\JsonContent()),
     * )
     */
    public function comm_building_part()
    {
        $data = BuildingPart::query()
        ->select(
        'osid',
        'toid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'firstdigitalcapturedate',
        'changetype',
        'geometry_area',
        'geometry_evidencedate',
        'geometry_updatedate',
        'geometry_source',
        'theme',
        'description',
        'description_evidencedate',
        'description_updatedate',
        'description_source',
        'oslandcovertiera',
        'oslandcovertierb',
        'oslandcover_evidencedate',
        'oslandcover_updatedate',
        'oslandcover_source',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_source',
        'absoluteheightroofbase',
        'relativeheightroofbase',
        'absoluteheightmaximum',
        'relativeheightmaximum',
        'absoluteheightminimum',
        'heightconfidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'height_source',
        'associatedstructure',
        'isobscured',
        'physicallevel',
        'capturespecification')
        ->selectRaw("st_transform(geometry,3857) as geometry_transformed, ST_AsGeoJSON(st_transform(geometry,4326)) as geometry_json")
        ->paginate(20);

        return response()->json([
            'success' => true,
            'http_code' => 200,
            'data' => ['building_part' => $data]
        ], 200);
    }

    /**
     * @OA\Get(
     * path="/comm_building_part_nearest",
     * security={{"bearerAuth":{}}},
     * tags={"Building Part"},
     * @OA\Parameter(
     *      name="latitude",
     *      in="query",
     *      required=true,
     *      @OA\Schema(
     *           type="number",
     *           format="double"
     *      )
     * ),
     * @OA\Parameter(
     *      name="longitude",
     *      in="query",
     *      required=true,
     *      @OA\Schema(
     *           type="number",
     *           format="double"
     *      )
     * ),
     * @OA\Parameter(
     *      name="distance",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *           type="number",
     *           format="double"
     *      )
     * ),
     * @OA\Parameter(
     *      name="imagedirection",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *           type="number",
     *           format="double"
     *      )
     * ),
     * @OA\Response(
     *      response=200,
     *      description="Get nearest building part",
     *      @OA\JsonContent()
     * ),
     * )
     */
    public function comm_building_part_nearest(Request $request)
    {
        $latitude = $request->latitude;
        $longitude = $request->longitude;
        $distance = $request->distance ?: 10;
        $imagedirection = $request->imagedirection ?: 9;

        $data = BuildingPart::query()
        ->select(
        'osid',
        'toid',
        'versiondate',
        'versionavailablefromdate',
        'versionavailabletodate',
        'firstdigitalcapturedate',
        'changetype',
        'geometry_area',
        'geometry_evidencedate',
        'geometry_updatedate',
        'geometry_source',
        'theme',
        'description',
        'description_evidencedate',
        'description_updatedate',
        'description_source',
        'oslandcovertiera',
        'oslandcovertierb',
        'oslandcover_evidencedate',
        'oslandcover_updatedate',
        'oslandcover_source',
        'oslandusetiera',
        'oslandusetierb',
        'oslanduse_evidencedate',
        'oslanduse_updatedate',
        'oslanduse_source',
        'absoluteheightroofbase',
        'relativeheightroofbase',
        'absoluteheightmaximum',
        'relativeheightmaximum',
        'absoluteheightminimum',
        'heightconfidencelevel',
        'height_evidencedate',
        'height_updatedate',
        'height_source',
        'associatedstructure',
        'isobscured',
        'physicallevel',
        'capturespecification')
        ->selectRaw("st_transform(geometry,3857) as geometry_transformed, ST_AsGeoJSON(st_transform(geometry,4326)) as geometry_json")
        ->whereRaw("st_intersects(st_transform(ST_MakeLine(ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, ST_SetSRID(ST_Project(ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, $distance, radians($imagedirection))::geometry, 4326)::geometry), 3857), st_transform(geometry, 3857))")
        ->orderByRaw("st_transform(geometry, 3857) <-> st_transform(ST_MakeLine( ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, ST_SetSRID(ST_Project(ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, $distance, radians($imagedirection))::geometry, 4326)::geometry), 3857)")
        ->limit(1)
        ->get();

        return response()->json([
            'success' => true,
            'http_code' => 200,
            'data' => ['building_part' => $data]
        ], 200);
    }

    /**
     * @OA\Get(
     * path="/comm_codepoint",
     * security={{"bearerAuth":{}}},
     * tags={"Codepoint"},
     * @OA\Response(response=200, description="List of codepoint", @OA\JsonContent()),
     * )
     */
    public function comm_codepoint(Request $request)
    {
        $postcode = $request->query('postcode');
        $min_lng = $request->query('min_lng');
        $min_lat = $request->query('min_lat');
        $max_lng = $request->query('max_lng');
        $max_lat = $request->query('max_lat');
        
        $query = Codepoint::query();
        
        if ($postcode) {
            $query->where('postcode', 'ILIKE', '%'.$postcode.'%');
        }
        
        if ($min_lng && $min_lat && $max_lng && $max_lat) {
            $query->whereRaw("ST_Intersects(geometry, ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), ST_SRID(geometry)))", 
                [$min_lng, $min_lat, $max_lng, $max_lat]);
        }
        
        $data = $query->paginate(100);
        
        $data->appends([
            'postcode' => $postcode,
            'min_lng' => $min_lng,
            'min_lat' => $min_lat,
            'max_lng' => $max_lng,
            'max_lat' => $max_lat
        ]);
        
        return new CodepointCollection($data);
    }

    /**
     * @OA\Get(
     * path="/comm_uprn",
     * security={{"bearerAuth":{}}},
     * tags={"UPRN"},
     * @OA\Response(response=200, description="List of UPRN address", @OA\JsonContent()),
     *   @OA\Parameter(
     *      name="uprn",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="string"
     *      ),
     *      example="1",
     *   ),
     *   @OA\Parameter(
     *      name="page",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="string"
     *      )
     *   ),
     * )
     */
    public function comm_uprn(Request $request)
    {
        $uprn = $request->query('uprn');
        $min_lng = $request->query('min_lng');
        $min_lat = $request->query('min_lat');
        $max_lng = $request->query('max_lng');
        $max_lat = $request->query('max_lat');
        
        $query = Uprn::query();
        
        if ($uprn) {
            $query->where('uprn', $uprn);
        }
        
        if ($min_lng && $min_lat && $max_lng && $max_lat) {
            $query->whereRaw("ST_Intersects(geom, ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), ST_SRID(geom)))", 
                [$min_lng, $min_lat, $max_lng, $max_lat]);
        }
        
        $data = $query->paginate(100);
        
        $data->appends([
            'uprn' => $uprn,
            'min_lng' => $min_lng,
            'min_lat' => $min_lat,
            'max_lng' => $max_lng,
            'max_lat' => $max_lat
        ]);

        return new UprnCollection($data);
    }

    /**
     * @OA\Get(
     * path="/comm_nhle",
     * security={{"bearerAuth":{}}},
     * tags={"NHLE"},
     * @OA\Response(response=200, description="List of NHLE", @OA\JsonContent()),
     * )
     */
    public function comm_nhle(Request $request)
    {
        $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-90,90']
        ]);
        $latitude = $request->query('latitude');
        $longitude = $request->query('longitude');
        $distance = $request->query('distance') ?: 5;
        $imagedirection = $request->query('imagedirection') ?: 9;
        
        $query = NHLE::query();
        
        if ($latitude && $longitude) {
            // Calculate target point based on direction
            $radians = deg2rad($imagedirection);
            $targetLng = $longitude + (sin($radians) * $distance * 0.00001);
            $targetLat = $latitude + (cos($radians) * $distance * 0.00001);
            
            // Using buffer to create a corridor for intersection
            $query
                ->whereRaw("ST_Intersects(
                    geom,
                    ST_Transform(
                        ST_SetSRID(
                            ST_Buffer(
                                ST_MakeLine(
                                    ST_SetSRID(ST_MakePoint(?, ?), 4326)::geometry,
                                    ST_SetSRID(ST_MakePoint(?, ?), 4326)::geometry
                                ),
                                0.0002
                            ),
                            4326
                        ),
                        ST_SRID(geom)
                    )
                )",
                [
                    $longitude, $latitude,
                    $targetLng, $targetLat
                ])
                // Just order by the direction the user is facing
                ->orderByRaw("
                    ST_Distance(
                        geom,
                        ST_Transform(
                            ST_SetSRID(ST_MakePoint(?, ?), 4326),
                            ST_SRID(geom)
                        )
                    ) ASC
                ",
                [
                    $targetLng, $targetLat
                ]);
        }
        
        $data = $query->limit(1)->get();
        
        return new NhleCollection($data);
    }

    /**
     * @OA\Get(
     *     path="/comm_land_registry_inspire",
     *     summary="Get land registry inspire records",
     *     description="Retrieve land registry inspire records based on filters or bounding box coordinates",
     *     tags={"Land Registry Inspire"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="inspire_id",
     *         in="query",
     *         required=false,
     *         description="INSPIRE ID to filter records",
     *         @OA\Schema(type="string"),
     *         example="31444717"
     *     ),
     *     @OA\Parameter(
     *         name="min_lng",
     *         in="query",
     *         required=false,
     *         description="Minimum longitude for bounding box",
     *         @OA\Schema(type="number", format="double"),
     *         example="-2.5"
     *     ),
     *     @OA\Parameter(
     *         name="min_lat",
     *         in="query",
     *         required=false,
     *         description="Minimum latitude for bounding box",
     *         @OA\Schema(type="number", format="double"),
     *         example="51.2"
     *     ),
     *     @OA\Parameter(
     *         name="max_lng",
     *         in="query",
     *         required=false,
     *         description="Maximum longitude for bounding box",
     *         @OA\Schema(type="number", format="double"),
     *         example="-2.2"
     *     ),
     *     @OA\Parameter(
     *         name="max_lat",
     *         in="query",
     *         required=false,
     *         description="Maximum latitude for bounding box",
     *         @OA\Schema(type="number", format="double"),
     *         example="51.6"
     *     ),
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         required=false,
     *         description="Page number for pagination",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of spatial boundary records",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="current_page",
     *                 type="integer",
     *                 example=1
     *             ),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="gmlId", type="string", example="gml123"),
     *                     @OA\Property(property="inspireId", type="integer", example=31444717),
     *                     @OA\Property(property="label", type="integer", example=123),
     *                     @OA\Property(property="nationalCadastralReference", type="integer", example=456),
     *                     @OA\Property(property="validFrom", type="string", format="date-time", example="2024-01-01T00:00:00Z"),
     *                     @OA\Property(property="beginLifespanVersion", type="string", format="date-time", example="2024-01-01T00:00:00Z"),
     *                     @OA\Property(property="geom", type="object", description="GeoJSON geometry")
     *                 )
     *             ),
     *             @OA\Property(
     *                 property="per_page",
     *                 type="integer",
     *                 example=100
     *             ),
     *             @OA\Property(
     *                 property="total",
     *                 type="integer",
     *                 example=150
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing bearer token"
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error"
     *     )
     * )
     */
    public function comm_land_registry_inspire(Request $request)
    {
        $inspire_id = $request->query('inspire_id');
        $min_lng = $request->query('min_lng');
        $min_lat = $request->query('min_lat');
        $max_lng = $request->query('max_lng');
        $max_lat = $request->query('max_lat');
        
        $query = LandRegistryInspire::query();
        
        if ($inspire_id) {
            $query->where('INSPIREID', $inspire_id);
        }
        
        if ($min_lng && $min_lat && $max_lng && $max_lat) {
            $query->whereRaw("ST_Intersects(geom, ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), ST_SRID(geom)))", 
                [$min_lng, $min_lat, $max_lng, $max_lat]);
        }
        
        $data = $query->paginate(100);
        
        $data->appends([
            'inspire_id' => $inspire_id,
            'min_lng' => $min_lng,
            'min_lat' => $min_lat,
            'max_lng' => $max_lng,
            'max_lat' => $max_lat
        ]);

        return new LandRegistryInspireCollection($data);
    }
}
