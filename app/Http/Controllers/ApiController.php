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
use App\Models\LandRegistryInspire;
use App\Models\OsmBuildingPart;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\NhleCollection;
use App\Http\Resources\UprnCollection;
use App\Http\Resources\UprnFeatureResource;
use App\Http\Resources\ShapeCollection;
use Illuminate\Support\Facades\Artisan;
use App\Http\Resources\CodepointCollection;
use App\Http\Resources\CodepointFeatureResource;
use App\Http\Resources\LandRegistryInspireCollection;
use App\Models\Attr\Building;
use App\Models\Attr\BuildingPartLink;
use App\Models\Attr\BuildingAddress;
use App\Http\Resources\BuildingCollection;

class ApiController extends Controller
{
    /**
     * @OA\Post(
     * path="/comm_get_paths",
     * security={{"bearerAuth":{}}},
     * tags={"Paths"},
     * summary="Get paths by user ID",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="4"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_get_paths(Request $request)
    {

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
            'status' => 'ok',
            'error_msg' => null,
            'paths' => $output
        ]);
    }

    /**
     * @OA\Post(
     * path="/comm_unassigned",
     * security={{"bearerAuth":{}}},
     * tags={"Photos"},
     * summary="Get unassigned photo IDs by user ID",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="4"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_unassigned(Request $request)
    {
        $user_id = $request->user_id;

        $ids = Photo::where('user_id', $user_id)->where('flg_deleted', 0)->whereNull('task_id')->pluck('id')->toArray();

        $output = [];
        $output['status'] = 'ok';
        $output['error_msg'] = NULL;
        $output['photos_ids'] = $ids;

        return response()->json($output);
    }

    /**
     * @OA\Post(
     * path="/comm_tasks",
     * security={{"bearerAuth":{}}},
     * tags={"Tasks"},
     * summary="Get tasks by user ID",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="3"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_tasks(Request $request)
    {
        $user_id = $request->user_id;


        $tasks = Task::withCount(['photos' => function ($query) {
            $query->where('flg_deleted', 0);
        }])
            ->with(['taskType' => function ($query) {
                $query->select('id', 'description');
            }])
            ->select('id', 'task.status', 'type_id', 'name', 'text', 'text_returned', 'date_created', 'task_due_date', 'note', 'text_reason')
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
     * path="/comm_status",
     * security={{"bearerAuth":{}}},
     * tags={"Tasks"},
     * summary="Update task status",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="task_id",
     *                 type="integer",
     *                 example="123"
     *             ),
     *             @OA\Property(
     *                 property="note",
     *                 type="string",
     *                 example="test"
     *             ),
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="new"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_status(Request $request)
    {

        $task_id = trim($request->task_id);
        $status = trim($request->status);
        $note = trim($request->note);
        $output = array();
        $output['status'] = 'ok';
        $output['error_msg'] = NULL;

        if ($task_id) {
            $task_status = Task::select('id', 'status')->where('id', $task_id)->first();
            $task_status = $task_status ? $task_status->status : '';

            if ($task_status == 'new' && $status == 'open') {
                $output = Task::setTaskStatus($task_id, $status, $note);
            } elseif (($task_status == 'new' || $task_status == 'open' || $task_status == 'returned') && $status == 'data provided') {
                if (Task::checkTaskPhotos($task_id)) {
                    $output = Task::setTaskStatus($task_id, $status, $note);
                } else {
                    $output['status'] = 'error';
                    $output['error_msg'] = 'task has no photos';
                }
            }
        }
        return response()->json($output);
    }

    /**
     * @OA\Post(
     * path="/comm_path",
     * security={{"bearerAuth":{}}},
     * tags={"Paths"},
     * summary="Create a new path",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="3"
     *             ),
     *             @OA\Property(
     *                 property="name",
     *                 type="string",
     *                 example="Test example path"
     *             ),
     *             @OA\Property(
     *                 property="deviceManufacture",
     *                 type="string",
     *                 example="Manufacturer"
     *             ),
     *             @OA\Property(
     *                 property="deviceModel",
     *                 type="string",
     *                 example="Model"
     *             ),
     *             @OA\Property(
     *                 property="devicePlatform",
     *                 type="string",
     *                 example="Platform"
     *             ),
     *             @OA\Property(
     *                 property="deviceVersion",
     *                 type="string",
     *                 example="Version"
     *             ),
     *             @OA\Property(
     *                 property="start",
     *                 type="string",
     *                 example="2024-05-01 12:00:00"
     *             ),
     *             @OA\Property(
     *                 property="end",
     *                 type="string",
     *                 example="2024-05-01 13:00:00"
     *             ),
     *             @OA\Property(
     *                 property="area",
     *                 type="number",
     *                 example="150.50"
     *             ),
     *             @OA\Property(
     *                 property="points",
     *                 type="string",
     *                 example="JSON array of points"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_path(Request $request)
    {
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
     * path="/comm_photo",
     * security={{"bearerAuth":{}}},
     * tags={"Photos"},
     * summary="Upload a photo",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="task_id",
     *                 type="integer",
     *                 example="125950"
     *             ),
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="4"
     *             ),
     *             @OA\Property(
     *                 property="photo",
     *                 type="string",
     *                 example="JSON object with photo data"
     *             ),
     *             @OA\Property(
     *                 property="digest",
     *                 type="string",
     *                 example="abc123digestvalue"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_photo(Request $request)
    {
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
                        Artisan::queue('app:pom-locate-by-nmea');
                        Artisan::queue('app:cron-check-location');
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
     * path="/comm_get_photo",
     * security={{"bearerAuth":{}}},
     * tags={"Photos"},
     * summary="Get photo by ID",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="photo_id",
     *                 type="integer",
     *                 example="18021"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_get_photo(Request $request)
    {
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
     * path="/comm_update",
     * security={{"bearerAuth":{}}},
     * tags={"Tasks"},
     * summary="Submit task photos and update task status",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="4"
     *             ),
     *             @OA\Property(
     *                 property="task_id",
     *                 type="integer",
     *                 example="125950"
     *             ),
     *             @OA\Property(
     *                 property="photos",
     *                 type="string",
     *                 example="JSON array of photos"
     *             ),
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="data provided"
     *             ),
     *             @OA\Property(
     *                 property="note",
     *                 type="string",
     *                 example="TEST TASK NOTE"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_update(Request $request)
    {
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
     * path="/comm_task_photos",
     * security={{"bearerAuth":{}}},
     * tags={"Tasks"},
     * summary="Get task photos",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="task_id",
     *                 type="integer",
     *                 example="125950"
     *             ),
     *             @OA\Property(
     *                 property="user_id",
     *                 type="integer",
     *                 example="4"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_task_photos(Request $request)
    {
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
     * path="/comm_delete_path",
     * security={{"bearerAuth":{}}},
     * tags={"Paths"},
     * summary="Delete a path",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="path_id",
     *                 type="integer",
     *                 example="373"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_delete_path(Request $request)
    {
        $uid = trim($request->input('path_id'));

        $output = [];
        $res = deletePath($uid);

        $output['status'] = $res > 0 ? 'ok' : 'error';
        $output['error_msg'] = $res > 0 ? null : 'Record deleted or record not found';

        return response()->json($output);
    }

    /**
     * @OA\Post(
     * path="/comm_delete_unassigned_photo",
     * security={{"bearerAuth":{}}},
     * tags={"Photos"},
     * summary="Delete unassigned photo",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="photo_id",
     *                 type="integer",
     *                 example="17804"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_delete_unassigned_photo(Request $request)
    {
        $uid = trim($request->input('photo_id'));

        $output = [];

        $res = deleteUnassignedPhoto($uid);

        $output['status'] = $res > 0 ? 'ok' : 'error';
        $output['error_msg'] = $res > 0 ? null : 'Record deleted or record not found';

        return response()->json($output);
    }


    /**
     * @OA\Get(
     * path="/comm_get_lpis",
     * security={{"bearerAuth":{}}},
     * tags={"LPIS"},
     * summary="Retrieve a list of LPIS records based on filters or bounding box",
     * @OA\Parameter(
     *      name="bbox",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="string"
     *      ),
     *      example="-0.6000,51.2000,-0.5900,51.2100",
     *      description="bbox coordinates"
     *   ),
     * @OA\Parameter(
     *      name="numberOfRecords",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="integer",
     *          default=20
     *      ),
     *      description="Number of records per page for pagination"
     *   ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_get_lpis(Request $request)
    {

        $bbox = explode(",", $request->bbox);
        $requestData = $request->all();
        $max_lng = $bbox[2] ?? false;
        $max_lat = $bbox[3] ?? false;
        $min_lng = $bbox[0] ?? false;
        $min_lat = $bbox[1] ?? false;

        $numberOfRecords = $requestData['numberOfRecords'] ?? 20;
        $query = Land::whereNotNull('wgs_geometry');

        if ($request->has('identificator')) {
            $query->where('identificator', $request->input('identificator'));
        }

        if ($max_lat && $min_lat && $max_lng && $min_lng) {
            $query
                ->where('wgs_min_lat', '<', $max_lat)
                ->where('wgs_max_lat', '>', $min_lat)
                ->where('wgs_min_lng', '<', $max_lng)
                ->where('wgs_max_lng', '>', $min_lng);
        }

        $lands = $query->limit($numberOfRecords)->get();

        $features = [];
        foreach ($lands as $land) {
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

    /**
     * @OA\Post(
     * path="/comm_lpis",
     * security={{"bearerAuth":{}}},
     * tags={"LPIS"},
     * summary="Save LPIS",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="identificator",
     *                 type="string",
     *                 example="identificator"
     *             ),
     *             @OA\Property(
     *                 property="pa_description",
     *                 type="string",
     *                 example="pa description"
     *             ),
     *             @OA\Property(
     *                 property="wkt",
     *                 type="string",
     *                 example="wkt data"
     *             ),
     *             @OA\Property(
     *                 property="wgs_geometry",
     *                 type="string",
     *                 example="JSON array of coordinates"
     *             ),
     *             @OA\Property(
     *                 property="wgs_max_lat",
     *                 type="number",
     *                 example="21.22"
     *             ),
     *             @OA\Property(
     *                 property="wgs_min_lat",
     *                 type="number",
     *                 example="-98.32"
     *             ),
     *             @OA\Property(
     *                 property="wgs_max_lng",
     *                 type="number",
     *                 example="3.21"
     *             ),
     *             @OA\Property(
     *                 property="wgs_min_lng",
     *                 type="number",
     *                 example="12.01"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_save_lpis(Request $request)
    {
        try {
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
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'error_msg' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @OA\Post(
     * path="/comm_get_lpis_record",
     * security={{"bearerAuth":{}}},
     * tags={"LPIS"},
     * summary="Get a single LPIS record",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="id",
     *                 type="integer",
     *                 example="627847"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_get_lpis_by_id(Request $request)
    {
        $request->validate([
            'id' => 'required',
        ]);
        $id = $request->id;
        $land = Land::find($id);
        if ($land) {
            return response()->json([
                'status' => 'ok',
                'error_msg' => null,
                'lpis' => $land
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'error_msg' => 'Record deleted or record not found'
            ]);
        }
    }

    /**
     * @OA\Post(
     * path="/comm_shapes",
     * security={{"bearerAuth":{}}},
     * tags={"Shapes"},
     * summary="Get shapes by coordinates",
     * @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             @OA\Property(
     *                 property="max_lat",
     *                 type="number",
     *                 example="1"
     *             ),
     *             @OA\Property(
     *                 property="min_lat",
     *                 type="number",
     *                 example="1"
     *             ),
     *             @OA\Property(
     *                 property="max_lng",
     *                 type="number",
     *                 example="1"
     *             ),
     *             @OA\Property(
     *                 property="min_lng",
     *                 type="number",
     *                 example="1"
     *             )
     *         )
     *     )
     * ),
     * @OA\Response(response=200, description="Successful response", @OA\JsonContent()),
     * )
     */
    public function comm_shapes(Request $request)
    {
        $maxEasting = $request->max_lng;
        $maxNorthing = $request->max_lat;
        $minEasting = $request->min_lng;
        $minNorthing = $request->min_lat;

        $data = Shape::query()
            ->when($minEasting, function ($query) use ($minEasting, $minNorthing, $maxEasting, $maxNorthing) {
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
                'capturespecification'
            )
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
                'capturespecification'
            )
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
     * path="/comm_osm_building_part_nearest",
     * security={{"bearerAuth":{}}},
     * tags={"OSM Building Part"},
     * @OA\Parameter(
     * name="latitude",
     * in="query",
     * required=true,
     * @OA\Schema(type="number", format="float")
     * ),
     * @OA\Parameter(
     * name="longitude",
     * in="query",
     * required=true,
     * @OA\Schema(type="number", format="float")
     * ),
     * @OA\Parameter(
     * name="distance",
     * in="query",
     * required=false,
     * @OA\Schema(type="number", format="float", default=10)
     * ),
     * @OA\Parameter(
     * name="imagedirection",
     * in="query",
     * required=false,
     * @OA\Schema(type="number", format="float", default=9)
     * ),
     * @OA\Response(
     * response=200,
     * description="Successful response",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="http_code", type="integer", example=200),
     * @OA\Property(property="data", type="object",
     * @OA\Property(property="building_part", type="array", @OA\Items(type="object"))
     * )
     * )
     * ),
     * )
     */
    public function comm_osm_building_part_nearest(Request $request)
    {
        $latitude = $request->latitude;
        $longitude = $request->longitude;
        $distance = $request->distance ?: 10;
        $imagedirection = $request->imagedirection ?: 9;

        try {
            $data = OsmBuildingPart::query()
                ->select([
                    'id',
                    'source',
                    'osm_id',
                    'name',
                    'ref_gb_uprn',
                    'base_shape',
                    'base_direction',
                    'base_orientation',
                    'base_height_m',
                    'base_levels',
                    'base_colour',
                    'base_material',
                    'base_angle_deg',
                    'building',
                    'building_part',
                    'building_levels',
                    'building_min_level',
                    'building_levels_underground',
                    'roof_levels',
                    'roof_shape',
                    'height_m',
                    'min_height_m',
                    'roof_height_m',
                    'levels',
                    'min_level',
                    'building_reference_number',
                    'tenure',
                    'construction_age_band',
                    'transaction_type'
                ])
                ->selectRaw("ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry_json")
                ->where('building_part', 'yes')
                ->whereRaw("st_intersects(st_transform(ST_MakeLine(ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, ST_SetSRID(ST_Project(ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, $distance, radians($imagedirection))::geometry, 4326)::geometry), 3857), st_transform(geom, 3857))")
                ->orderByRaw("st_transform(geom, 3857) <-> st_transform(ST_MakeLine( ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, ST_SetSRID(ST_Project(ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geometry, $distance, radians($imagedirection))::geometry, 4326)::geometry), 3857)")
                ->get();

            // Transform data to match expected format
            $transformedData = $data->map(function ($item) {
                return [
                    'id' => $item->id,
                    'osm_id' => $item->osm_id,
                    'name' => $item->name,
                    'source' => $item->source,
                    'ref_gb_uprn' => $item->ref_gb_uprn,
                    'geojson' => [
                        'type' => 'FeatureCollection',
                        'features' => [
                            [
                                'type' => 'Feature',
                                'id' => $item->id,
                                'geometry' => json_decode($item->geometry_json),
                                'properties' => [
                                    'osm_id' => $item->osm_id,
                                    'name' => $item->name,
                                    'source' => $item->source,
                                    'ref_gb_uprn' => $item->ref_gb_uprn,
                                    'base_shape' => $item->base_shape,
                                    'base_direction' => $item->base_direction,
                                    'base_orientation' => $item->base_orientation,
                                    'base_height_m' => $item->base_height_m,
                                    'base_levels' => $item->base_levels,
                                    'base_colour' => $item->base_colour,
                                    'base_material' => $item->base_material,
                                    'base_angle_deg' => $item->base_angle_deg,
                                    'building' => $item->building,
                                    'building_part' => $item->building_part,
                                    'building_levels' => $item->building_levels,
                                    'building_min_level' => $item->building_min_level,
                                    'building_levels_underground' => $item->building_levels_underground,
                                    'roof_levels' => $item->roof_levels,
                                    'roof_shape' => $item->roof_shape,
                                    'height_m' => $item->height_m,
                                    'min_height_m' => $item->min_height_m,
                                    'roof_height_m' => $item->roof_height_m,
                                    'levels' => $item->levels,
                                    'min_level' => $item->min_level,
                                    'building_reference_number' => $item->building_reference_number,
                                    'tenure' => $item->tenure,
                                    'construction_age_band' => $item->construction_age_band,
                                    'transaction_type' => $item->transaction_type,
                                    // Map OSM fields to legacy format for compatibility
                                    'relativeheightmaximum' => $item->height_m ?: $item->roof_height_m,
                                    'relativeheightroofbase' => $item->min_height_m ?: 0,
                                    'absoluteheightmaximum' => $item->height_m ?: $item->roof_height_m,
                                    'absoluteheightminimum' => $item->min_height_m
                                ]
                            ]
                        ]
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'http_code' => 200,
                'data' => ['building_part' => $transformedData]
            ], 200);
        } catch (Exception $e) {
            Log::error('OSM Building Part Nearest Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'http_code' => 500,
                'message' => 'Error fetching OSM building part data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * @OA\Get(
     * path="/comm_codepoint",
     * security={{"bearerAuth":{}}},
     * tags={"Codepoint"},
     * @OA\Parameter(
     *      name="postcode",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="string"
     *      ),
     *      example="BA1 0AH",
     *   ),
     * @OA\Parameter(
     *      name="page",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="string"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="min_lng",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="min_lat",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="max_lng",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="max_lat",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="lng",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="lat",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
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
        $lng = $request->query('lng');
        $lat = $request->query('lat');

        // If lng and lat are provided, return only the nearest codepoint (optimized)
        if ($lng && $lat) {
            // Transform input point to match database SRID (27700)
            $nearest = Codepoint::query()
                ->selectRaw('*, ST_Distance(ST_Transform(geometry, 4326)::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) as distance', [$lng, $lat])
                ->orderByRaw('ST_Transform(geometry, 4326) <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)', [$lng, $lat])
                ->limit(1)
                ->first();

            if ($nearest) {
                return response()->json([
                    'data' => new CodepointFeatureResource($nearest)
                ]);
            }

            return response()->json(['data' => null]);
        }

        // Original behavior for postcode search or bounding box
        $query = Codepoint::query();

        if ($postcode) {
            $query->where('postcode', 'ILIKE', '%' . $postcode . '%');
        }

        if ($min_lng && $min_lat && $max_lng && $max_lat) {
            $query->whereRaw(
                "ST_Intersects(geometry, ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), ST_SRID(geometry)))",
                [$min_lng, $min_lat, $max_lng, $max_lat]
            );
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
        $lng = $request->query('lng');
        $lat = $request->query('lat');

        // If lng and lat are provided, return only the nearest UPRN (optimized)
        if ($lng && $lat) {
            $nearest = Uprn::query()
                ->selectRaw('*, ST_Distance(ST_Transform(geom, 4326)::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) as distance', [$lng, $lat])
                ->orderByRaw('ST_Transform(geom, 4326) <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)', [$lng, $lat])
                ->limit(1)
                ->first();

            if ($nearest) {
                return response()->json([
                    'data' => new UprnFeatureResource($nearest)
                ]);
            }

            return response()->json(['data' => null]);
        }

        // Original behavior for uprn search or bounding box
        $query = Uprn::query();

        if ($uprn) {
            $query->where('uprn', $uprn);
        }

        if ($min_lng && $min_lat && $max_lng && $max_lat) {
            $query->whereRaw(
                "ST_Intersects(geom, ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), ST_SRID(geom)))",
                [$min_lng, $min_lat, $max_lng, $max_lat]
            );
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
     * @OA\Parameter(
     *      name="latitude",
     *      in="query",
     *      required=true,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      ),
     *      example="51.5074"
     *   ),
     * @OA\Parameter(
     *      name="longitude",
     *      in="query",
     *      required=true,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      ),
     *      example="-0.1278"
     *   ),
     * @OA\Response(response=200, description="List of NHLE data", @OA\JsonContent()),
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
                ->whereRaw(
                    "ST_Intersects(
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
                        $longitude,
                        $latitude,
                        $targetLng,
                        $targetLat
                    ]
                )
                // Just order by the direction the user is facing
                ->orderByRaw(
                    "
                    ST_Distance(
                        geom,
                        ST_Transform(
                            ST_SetSRID(ST_MakePoint(?, ?), 4326),
                            ST_SRID(geom)
                        )
                    ) ASC
                ",
                    [
                        $targetLng,
                        $targetLat
                    ]
                );
        }

        $data = $query->limit(1)->get();

        return new NhleCollection($data);
    }

    /**
     * @OA\Get(
     * path="/comm_land_registry_inspire",
     * security={{"bearerAuth":{}}},
     * tags={"Land Registry"},
     * @OA\Parameter(
     *      name="inspire_id",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="string"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="min_lng",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="min_lat",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="max_lng",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Parameter(
     *      name="max_lat",
     *      in="query",
     *      required=false,
     *      @OA\Schema(
     *          type="number",
     *          format="double"
     *      )
     *   ),
     * @OA\Response(response=200, description="List of land registry inspire data", @OA\JsonContent()),
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
            $query->whereRaw(
                "ST_Intersects(geom, ST_Transform(ST_MakeEnvelope(?, ?, ?, ?, 4326), ST_SRID(geom)))",
                [$min_lng, $min_lat, $max_lng, $max_lat]
            );
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

    /**
     * @OA\Get(
     * path="/comm_get_building_attributes",
     * security={{"bearerAuth":{}}},
     * tags={"Building Attributes"},
     * @OA\Parameter(
     *      name="osid",
     *      in="query",
     *      required=true,
     *      @OA\Schema(
     *          type="string"
     *      ),
     *      example="12345"
     *   ),
     * @OA\Response(response=200, description="Building attributes data", @OA\JsonContent()),
     * )
     */
    public function comm_get_building_attributes(Request $request)
    {
        $osid = $request->osid;

        // Single optimized query with join and eager loading
        $building = Building::whereHas('buildingPartLinks', function ($query) use ($osid) {
            $query->where('buildingpartid', $osid);
        })
            ->with('buildingAddresses.uprn')
            ->get();

        if ($building->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Building not found for the given buildingpartid'
            ], 404);
        }

        return new BuildingCollection($building);
    }
}
