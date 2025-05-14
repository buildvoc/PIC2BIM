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
            'photo' => getPhoto($photo_id, true),
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
            'photos' => getTaskPhotos($task_id, $user_id, true),
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
