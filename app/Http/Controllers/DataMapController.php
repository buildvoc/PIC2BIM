<?php

namespace App\Http\Controllers;

use App\Http\Resources\BuiltupAreaCollection;
use App\Http\Resources\BuildingCollection;
use App\Http\Resources\BuildingCollectionV4;
use App\Http\Resources\BuildingPartCollection;
use App\Http\Resources\BuildingPartCollectionV2;
use App\Http\Resources\SiteCollection;
use App\Http\Resources\DataMapPhotoCollection;
use App\Models\BuiltupArea;
use App\Models\Attr\Building;
use App\Models\Attr\BuildingPart;
use App\Models\Attr\BuildingPartV2;
use App\Models\Attr\BuildingPartSiteRefV2;
use App\Models\Attr\Site;
use App\Models\NHLE;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use App\Models\Attr\SiteAddressReference;
use App\Models\Attr\BuildingAddress;
use App\Models\Attr\BuildingPartLink;
use App\Models\Attr\BuildingSiteLink;
use App\Models\Attr\Uprn;
use App\Models\LandRegistryCadastral;
use App\Models\LandRegistryInspire;
use App\Models\EpcCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DataMapController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('DataMap/Index', [
            'shapes' => null,
            'buildings' => ['data' => ['type' => 'FeatureCollection', 'features' => []]],
            'buildingParts' => ['data' => ['type' => 'FeatureCollection', 'features' => []]],
            'sites' => ['data' => ['type' => 'FeatureCollection', 'features' => []]],
            'nhle' => [],
            'photos' => ['type' => 'FeatureCollection', 'features' => []],
            'center' => null,
            'uprn' => ['data' => ['type' => 'FeatureCollection', 'features' => []]]
        ]);
    }

    /**
     * @OA\Post(
     *     path="/builtup-area",
     *     security={{"bearerAuth":{}}},
     *     tags={"BuiltupArea"},
     *     summary="Get all built-up areas",
     *     description="Retrieves all built-up areas from the ONS BUA dataset as GeoJSON features",
     *     @OA\Response(
     *         response=200,
     *         description="Successful response",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="shapes",
     *                 type="object",
     *                 description="GeoJSON FeatureCollection containing built-up area data"
     *             )
     *         )
     *     )
     * )
     */
    public function getBuiltupArea(Request $request)
    {
        $BuiltupAreas = BuiltupArea::query()->get();

        return response()->json([
            'shapes' => new BuiltupAreaCollection($BuiltupAreas)
        ]);
    }

    /**
     * @OA\Post(
     *     path="/get-area",
     *     security={{"bearerAuth":{}}},
     *     tags={"Area"},
     *     summary="Get buildings and center point for specified areas",
     *     description="Retrieves buildings that intersect with the specified built-up area IDs and calculates the center point of the areas",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="application/json",
     *             @OA\Schema(
     *                 @OA\Property(
     *                     property="area_ids",
     *                     type="array",
     *                     @OA\Items(type="integer"),
     *                     example={1, 2, 3},
     *                     description="Array of built-up area IDs to filter buildings"
     *                 ),
     *                 @OA\Property(
     *                     property="include_bua_filter",
     *                     type="boolean",
     *                     example=true,
     *                     description="Whether to include built-up area filtering"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful response",
     *         @OA\JsonContent(
     *             @OA\Property(
     *                 property="buildings",
     *                 type="object",
     *                 description="GeoJSON FeatureCollection containing building data"
     *             ),
     *             @OA\Property(
     *                 property="center",
     *                 type="object",
     *                 description="Center point coordinates of the specified areas"
     *             )
     *         )
     *     )
     * )
     */
    public function getArea(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);

        if (!is_array($areaIds)) {
            if (is_string($areaIds) && str_starts_with($areaIds, '[')) {
                $areaIds = json_decode($areaIds, true);
            } else {
                $areaIds = [$areaIds];
            }
        }

        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);

        // Fetch buildings
        $buildings = collect();
        $buildingQuery = Building::query();

        if (!empty($areaIds)) {
            $builtupAreaGeometriesQuery = BuiltupArea::query()
                ->whereIn('fid', $areaIds)
                ->select('geometry');

            $buildingQuery->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select(DB::raw(1))
                    ->fromSub($builtupAreaGeometriesQuery, 's')
                    ->whereRaw('ST_INTERSECTS(bld_fts_building.geometry, s.geometry)');
            });
        }

        $buildingQuery
            ->with('sites', 'buildingAddresses')
            ->chunk(2000, function ($chunk) use (&$buildings) {
                $buildings = $buildings->merge($chunk);
            });

        // Calculate center point
        $center = null;
        if (!empty($areaIds)) {
            $centerData = DB::table('ons_bua')
                ->select(DB::raw('ST_AsGeoJSON(ST_Transform(ST_Centroid(ST_Collect(geometry)), 4326)) as center'))
                ->whereIn('fid', $areaIds)
                ->first();

            if ($centerData && $centerData->center) {
                $center = json_decode($centerData->center);
            }
        }

        // Prepare response
        $responseData = [
            'buildings' => new BuildingCollectionV4($buildings),
            'center' => $center,
        ];

        Log::info('getArea response prepared', [
            'buildings_count' => $buildings->count(),
            'has_center' => !is_null($center)
        ]);

        return response()->json($responseData);
    }

    /**
     * Stream NHLE data in chunks
     */
    public function streamNHLEData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);

        if (!is_array($areaIds)) {
            if (is_string($areaIds) && str_starts_with($areaIds, '[')) {
                $areaIds = json_decode($areaIds, true);
            } else {
                $areaIds = [$areaIds];
            }
        }

        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 50);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 120000');

            // Build query
            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);
                $query = "
                    SELECT 
                        n.gid,
                        n.objectid,
                        n.listentry,
                        n.name,
                        n.grade,
                        n.listdate,
                        n.amenddate,
                        n.capturesca,
                        n.hyperlink,
                        n.ngr,
                        n.easting,
                        n.northing,
                        n.latitude,
                        n.longitude,
                        ST_AsGeoJSON(ST_Transform(n.geom, 4326)) as geometry
                    FROM nhle_ n
                    WHERE EXISTS (
                        SELECT 1 FROM ons_bua b
                        WHERE b.fid IN ({$areaIdsString})
                        AND ST_INTERSECTS(n.geom, b.geometry)
                    )
                ";
            } else {
                $query = "
                    SELECT 
                        n.gid,
                        n.objectid,
                        n.listentry,
                        n.name,
                        n.grade,
                        n.listdate,
                        n.amenddate,
                        n.capturesca,
                        n.hyperlink,
                        n.ngr,
                        n.easting,
                        n.northing,
                        n.latitude,
                        n.longitude,
                        ST_AsGeoJSON(ST_Transform(n.geom, 4326)) as geometry
                    FROM nhle_ n
                ";
            }

            $results = DB::select($query);
            $totalCount = count($results);
            $chunks = array_chunk($results, $chunkSize);
            $totalChunks = count($chunks);

            // Send metadata
            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            // Stream chunks
            foreach ($chunks as $chunkIndex => $chunk) {
                $nhleChunk = [];

                foreach ($chunk as $row) {
                    if (!empty($row->geometry)) {
                        $nhleModel = new NHLE();
                        $nhleModel->gid = $row->gid;
                        $nhleModel->objectid = $row->objectid;
                        $nhleModel->listentry = $row->listentry;
                        $nhleModel->name = $row->name;
                        $nhleModel->grade = $row->grade;
                        $nhleModel->listdate = $row->listdate;
                        $nhleModel->amenddate = $row->amenddate;
                        $nhleModel->capturesca = $row->capturesca;
                        $nhleModel->hyperlink = $row->hyperlink;
                        $nhleModel->ngr = $row->ngr;
                        $nhleModel->easting = $row->easting;
                        $nhleModel->northing = $row->northing;
                        $nhleModel->latitude = $row->latitude;
                        $nhleModel->longitude = $row->longitude;
                        $nhleModel->geom = json_decode($row->geometry);
                        $nhleChunk[] = $nhleModel;
                    }
                }

                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $nhleChunk,
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                usleep(10000); // 10ms
            }

            // Send complete
            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";

            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream Building Parts data in chunks
     */
    public function streamBuildingPartsData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            $query = BuildingPartV2::query();

            if ($includeBuaFilter && !empty($areaIds)) {
                $builtupAreaGeometriesQuery = BuiltupArea::query()
                    ->whereIn('fid', $areaIds)
                    ->select('geometry');

                $query->whereExists(function ($q) use ($builtupAreaGeometriesQuery) {
                    $q->select(DB::raw(1))
                        ->fromSub($builtupAreaGeometriesQuery, 's')
                        ->whereRaw('ST_INTERSECTS(bld_fts_buildingpart_v2.geometry, s.geometry)');
                });
            }

            $totalCount = $query->count();
            $totalChunks = ceil($totalCount / $chunkSize);

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            $query->with('buildingPartSiteRefs')
                ->chunk($chunkSize, function ($buildingParts) use (&$chunkIndex, $totalChunks) {
                    $collection = new BuildingPartCollectionV2($buildingParts);
                    $data = $collection->toArray(request());

                    echo "data: " . json_encode([
                        'type' => 'chunk',
                        'chunkIndex' => $chunkIndex,
                        'data' => $data,
                        'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                    ]) . "\n\n";

                    ob_flush();
                    flush();
                    $chunkIndex++;
                    usleep(10000);
                });

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream Land Registry data in chunks
     */
    public function streamLandRegistryData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 120000');

            $landRegistryFeatures = collect();

            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);

                $bbox = DB::table('ons_bua')
                    ->selectRaw('
                        ST_XMin(ST_Transform(ST_SetSRID(ST_Extent(geometry), 27700), 4326)) as min_lng,
                        ST_YMin(ST_Transform(ST_SetSRID(ST_Extent(geometry), 27700), 4326)) as min_lat,
                        ST_XMax(ST_Transform(ST_SetSRID(ST_Extent(geometry), 27700), 4326)) as max_lng,
                        ST_YMax(ST_Transform(ST_SetSRID(ST_Extent(geometry), 27700), 4326)) as max_lat
                    ')
                    ->whereIn('fid', $areaIds)
                    ->first();

                if ($bbox && $bbox->min_lng && $bbox->min_lat && $bbox->max_lng && $bbox->max_lat) {
                    $expandedBbox = [
                        'min_lng' => $bbox->min_lng - 0.01,
                        'min_lat' => $bbox->min_lat - 0.01,
                        'max_lng' => $bbox->max_lng + 0.01,
                        'max_lat' => $bbox->max_lat + 0.01
                    ];

                    $results = DB::select("
                        SELECT 
                            lri.gml_id,
                            lri.\"INSPIREID\" as inspireid,
                            lri.\"LABEL\" as label,
                            lri.\"NATIONALCADASTRALREFERENCE\" as nationalcadastralreference,
                            lri.\"VALIDFROM\" as validfrom,
                            lri.\"BEGINLIFESPANVERSION\" as beginlifespanversion,
                            ST_AsGeoJSON(lri.geom) as geometry,
                            GeometryType(lri.geom) as geom_type
                        FROM land_registry_inspire lri
                        WHERE lri.geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)
                        AND EXISTS (
                            SELECT 1 FROM nhle_ n, ons_bua b
                            WHERE b.fid IN ({$areaIdsString})
                            AND ST_INTERSECTS(n.geom, b.geometry)
                            AND ST_INTERSECTS(ST_Transform(n.geom, 4326), lri.geom)
                        )
                    ", [
                        $expandedBbox['min_lng'],
                        $expandedBbox['min_lat'],
                        $expandedBbox['max_lng'],
                        $expandedBbox['max_lat']
                    ]);

                    $seenGmlIds = [];
                    foreach ($results as $row) {
                        if (!empty($row->geometry) && !in_array($row->gml_id, $seenGmlIds)) {
                            $seenGmlIds[] = $row->gml_id;
                            $geometry = json_decode($row->geometry, true);
                            $landRegistryFeatures->push([
                                'type' => 'Feature',
                                'geometry' => $geometry,
                                'properties' => [
                                    'gml_id' => $row->gml_id,
                                    'INSPIREID' => $row->inspireid,
                                    'LABEL' => $row->label,
                                    'NATIONALCADASTRALREFERENCE' => $row->nationalcadastralreference,
                                    'VALIDFROM' => $row->validfrom,
                                    'BEGINLIFESPANVERSION' => $row->beginlifespanversion,
                                ]
                            ]);
                        }
                    }
                }
            }

            $totalCount = $landRegistryFeatures->count();
            $chunks = $landRegistryFeatures->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream Sites data in chunks
     */
    public function streamSitesData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 120000');

            $sites = collect();

            // Build the builtup area geometries query if needed
            $builtupAreaGeometriesQuery = null;
            if ($includeBuaFilter && !empty($areaIds)) {
                $builtupAreaGeometriesQuery = DB::table('ons_bua')
                    ->select('geometry')
                    ->whereIn('fid', $areaIds);
            }

            $query = Site::query();

            if ($includeBuaFilter && $builtupAreaGeometriesQuery !== null) {
                $query->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                    $query->select(DB::raw(1))
                        ->fromSub($builtupAreaGeometriesQuery, 's')
                        ->whereRaw('ST_INTERSECTS(lus_fts_site.geometry, s.geometry)');
                });
            }

            $query->with(['buildings', 'buildingPartSiteRefs'])
                ->chunk(2000, function ($chunk) use (&$sites) {
                    $sites = $sites->merge($chunk);
                });

            // Convert to resource collection
            $siteCollection = new SiteCollection($sites);
            $sitesArray = $siteCollection->toArray(request());
            $sitesData = collect($sitesArray['features'] ?? []);

            $totalCount = $sitesData->count();
            $chunks = $sitesData->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream Photos data in chunks
     */
    public function streamPhotosData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 20); // Smaller default for photos (they have more data per item)

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 120000');

            // Build the builtup area geometries query if needed
            $builtupAreaGeometriesQuery = null;
            if ($includeBuaFilter && !empty($areaIds)) {
                $builtupAreaGeometriesQuery = DB::table('ons_bua')
                    ->select('geometry')
                    ->whereIn('fid', $areaIds);
            }

            $users = collect();
            User::query()
                ->join('user_role as ur', 'user.id', '=', 'ur.user_id')
                ->select('user.id', 'user.login', 'user.name', 'user.surname', 'user.identification_number', 'user.vat', 'user.email')
                ->where('ur.role_id', '=', User::FARMER_ROLE)
                ->where('user.active', '=', 1)
                ->where('user.pa_id', '=', Auth::user()->pa_id)
                ->with(['photos' => function ($query) use ($builtupAreaGeometriesQuery, $includeBuaFilter) {
                    $query->where('flg_deleted', 0);

                    if ($includeBuaFilter && $builtupAreaGeometriesQuery !== null) {
                        $query->whereExists(function ($subQuery) use ($builtupAreaGeometriesQuery) {
                            $subQuery->select(DB::raw(1))
                                ->fromSub($builtupAreaGeometriesQuery, 's')
                                ->whereRaw('ST_INTERSECTS(ST_Transform(ST_SetSRID(ST_MakePoint(photo.lng, photo.lat), 4326), 27700), s.geometry)');
                        });
                    }
                }])
                ->chunk(2000, function ($chunk) use (&$users) {
                    $users = $users->merge($chunk);
                });

            $users = $users->filter(function ($user) {
                return $user->photos->isNotEmpty();
            });

            $photos = collect();
            foreach ($users as $user) {
                foreach ($user->photos as $photo) {
                    $photo->user_name = $user->name;
                    $photo->link = $photo->link;
                    $photos->push($photo);
                }
            }

            // Convert to resource collection
            $photoCollection = new DataMapPhotoCollection($photos);
            $photosArray = $photoCollection->toArray(request());
            $photosData = collect($photosArray['features'] ?? []);

            $totalCount = $photosData->count();
            $chunks = $photosData->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream UPRN data in chunks
     */
    public function streamUPRNData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 180000'); // 3 minutes

            $uprnFeatures = collect();

            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);

                // Use CTE with window function for better performance
                $uprnResults = DB::select("
                    WITH filtered_uprn AS (
                        SELECT u.uprn, u.geom
                        FROM osopenuprn_address u
                        WHERE u.geom IS NOT NULL
                        AND EXISTS (
                            SELECT 1 FROM ons_bua b
                            WHERE b.fid IN ({$areaIdsString})
                            AND ST_Intersects(u.geom, b.geometry)
                        )
                    ),
                    latest_epc AS (
                        SELECT DISTINCT ON (uprn)
                            uprn::bigint,
                            floor_level, property_type, built_form, current_energy_rating,
                            potential_energy_rating, current_energy_efficiency, potential_energy_efficiency,
                            total_floor_area, construction_age_band, lodgement_date, transaction_type, tenure
                        FROM epc_certificate
                        WHERE uprn::bigint IN (SELECT uprn FROM filtered_uprn)
                        ORDER BY uprn, lodgement_date DESC NULLS LAST
                    )
                    SELECT 
                        u.uprn,
                        ST_AsGeoJSON(ST_Transform(u.geom, 4326)) as geom,
                        e.floor_level, e.property_type, e.built_form, e.current_energy_rating,
                        e.potential_energy_rating, e.current_energy_efficiency, e.potential_energy_efficiency,
                        e.total_floor_area, e.construction_age_band, e.lodgement_date, e.transaction_type, e.tenure
                    FROM filtered_uprn u
                    LEFT JOIN latest_epc e ON e.uprn = u.uprn
                ");
            } else {
                $uprnResults = DB::select("
                    WITH filtered_uprn AS (
                        SELECT u.uprn, u.geom
                        FROM osopenuprn_address u
                        WHERE u.geom IS NOT NULL
                        LIMIT 5000
                    ),
                    latest_epc AS (
                        SELECT DISTINCT ON (uprn)
                            uprn::bigint,
                            floor_level, property_type, built_form, current_energy_rating,
                            potential_energy_rating, current_energy_efficiency, potential_energy_efficiency,
                            total_floor_area, construction_age_band, lodgement_date, transaction_type, tenure
                        FROM epc_certificate
                        WHERE uprn::bigint IN (SELECT uprn FROM filtered_uprn)
                        ORDER BY uprn, lodgement_date DESC NULLS LAST
                    )
                    SELECT 
                        u.uprn,
                        ST_AsGeoJSON(ST_Transform(u.geom, 4326)) as geom,
                        e.floor_level, e.property_type, e.built_form, e.current_energy_rating,
                        e.potential_energy_rating, e.current_energy_efficiency, e.potential_energy_efficiency,
                        e.total_floor_area, e.construction_age_band, e.lodgement_date, e.transaction_type, e.tenure
                    FROM filtered_uprn u
                    LEFT JOIN latest_epc e ON e.uprn = u.uprn
                ");
            }

            foreach ($uprnResults as $row) {
                if (!empty($row->geom)) {
                    $properties = [
                        'id' => (int)$row->uprn,
                        'uprn' => (int)$row->uprn,
                    ];

                    // Add EPC data if exists
                    if ($row->property_type !== null) {
                        $properties = array_merge($properties, [
                            'floor_level' => $row->floor_level,
                            'property_type' => $row->property_type,
                            'built_form' => $row->built_form,
                            'current_energy_rating' => $row->current_energy_rating,
                            'potential_energy_rating' => $row->potential_energy_rating,
                            'current_energy_efficiency' => $row->current_energy_efficiency,
                            'potential_energy_efficiency' => $row->potential_energy_efficiency,
                            'total_floor_area' => $row->total_floor_area,
                            'construction_age_band' => $row->construction_age_band,
                            'lodgement_date' => $row->lodgement_date,
                            'transaction_type' => $row->transaction_type,
                            'tenure' => $row->tenure,
                        ]);
                    }

                    $uprnFeatures->push([
                        'type' => 'Feature',
                        'geometry' => json_decode($row->geom, true),
                        'properties' => $properties
                    ]);
                }
            }

            $totalCount = $uprnFeatures->count();
            $chunks = $uprnFeatures->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream EPC Certificates data in chunks
     */
    public function streamEPCCertificatesData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 180000'); // 3 minutes

            $epcCertificates = collect();

            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);

                $epcResults = DB::select("
                    SELECT 
                        e.id, e.lmk_key, e.building_reference_number, e.current_energy_rating,
                        e.potential_energy_rating, e.property_type, e.built_form, e.inspection_date,
                        e.local_authority, e.lodgement_date, e.transaction_type, e.total_floor_area,
                        e.co2_emissions_current, e.energy_consumption_current, e.uprn,
                        ST_AsGeoJSON(ST_Transform(u.geom, 4326)) as geometry
                    FROM epc_certificate e
                    LEFT JOIN osopenuprn_address u ON e.uprn::bigint = u.uprn
                    AND EXISTS (
                        SELECT 1 FROM ons_bua b
                        WHERE b.fid IN ({$areaIdsString})
                        AND ST_INTERSECTS(u.geom, b.geometry)
                    )
                ");
            } else {
                $epcResults = DB::select("
                    SELECT 
                        e.id, e.lmk_key, e.building_reference_number, e.current_energy_rating,
                        e.potential_energy_rating, e.property_type, e.built_form, e.inspection_date,
                        e.local_authority, e.lodgement_date, e.transaction_type, e.total_floor_area,
                        e.co2_emissions_current, e.energy_consumption_current, e.uprn,
                        ST_AsGeoJSON(ST_Transform(u.geom, 4326)) as geometry
                    FROM epc_certificate e
                    LEFT JOIN osopenuprn_address u ON e.uprn::bigint = u.uprn
                ");
            }

            foreach ($epcResults as $row) {
                // if (!empty($row->geometry)) {
                    $epcCertificates->push([
                        'type' => 'Feature',
                        'geometry' => (!empty($row->geometry) ? json_decode($row->geometry, true) : null),
                        'properties' => [
                            'id' => $row->id,
                            'lmk_key' => $row->lmk_key,
                            'building_reference_number' => $row->building_reference_number,
                            'current_energy_rating' => $row->current_energy_rating,
                            'potential_energy_rating' => $row->potential_energy_rating,
                            'property_type' => $row->property_type,
                            'built_form' => $row->built_form,
                            'inspection_date' => $row->inspection_date,
                            'local_authority' => $row->local_authority,
                            'lodgement_date' => $row->lodgement_date,
                            'transaction_type' => $row->transaction_type,
                            'total_floor_area' => $row->total_floor_area,
                            'co2_emissions_current' => $row->co2_emissions_current,
                            'energy_consumption_current' => $row->energy_consumption_current,
                            'uprn' => $row->uprn,
                        ]
                    ]);
                // }
            }

            $totalCount = $epcCertificates->count();
            $chunks = $epcCertificates->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream OSM Building Parts data in chunks
     */
    public function streamOSMBuildingPartsData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 180000'); // 3 minutes

            $osmBuildingParts = collect();

            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);
                $rawResults = DB::select("
                    SELECT 
                        id, source, osm_id, name, ref_gb_uprn,
                        base_shape, base_orientation, building, building_part,
                        building_levels, roof_shape, height_m,
                        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
                    FROM osm_building_part
                    WHERE geom IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM ons_bua b
                        WHERE b.fid IN ({$areaIdsString})
                        AND ST_INTERSECTS(ST_Transform(osm_building_part.geom, 27700), b.geometry)
                    )
                ");
            } else {
                $rawResults = DB::select("
                    SELECT 
                        id, source, osm_id, name, ref_gb_uprn,
                        base_shape, base_orientation, building, building_part,
                        building_levels, roof_shape, height_m,
                        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
                    FROM osm_building_part
                    WHERE geom IS NOT NULL
                ");
            }

            foreach ($rawResults as $row) {
                if (!empty($row->geometry)) {
                    $geometry = json_decode($row->geometry, true);
                    $osmBuildingParts->push([
                        'type' => 'Feature',
                        'geometry' => $geometry,
                        'properties' => [
                            'id' => $row->id,
                            'source' => $row->source,
                            'osm_id' => $row->osm_id,
                            'name' => $row->name,
                            'ref_gb_uprn' => $row->ref_gb_uprn,
                            'base_shape' => $row->base_shape,
                            'base_orientation' => $row->base_orientation,
                            'building' => $row->building,
                            'building_part' => $row->building_part,
                            'building_levels' => $row->building_levels,
                            'roof_shape' => $row->roof_shape,
                            'height_m' => $row->height_m,
                        ]
                    ]);
                }
            }

            $totalCount = $osmBuildingParts->count();
            $chunks = $osmBuildingParts->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream OSM Addresses data in chunks
     */
    public function streamOSMAddressesData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 180000'); // 3 minutes

            $osmAddresses = collect();

            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);
                $addressResults = DB::select("
                    SELECT 
                        id, building_part_id, osm_id, uprn, source,
                        housenumber, unit, street, suburb, city, postcode,
                        ST_AsGeoJSON(point_wgs84) as geometry
                    FROM osm_address
                    WHERE point_wgs84 IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM ons_bua b
                        WHERE b.fid IN ({$areaIdsString})
                        AND ST_INTERSECTS(ST_Transform(osm_address.point_wgs84, 27700), b.geometry)
                    )
                ");
            } else {
                $addressResults = DB::select("
                    SELECT 
                        id, building_part_id, osm_id, uprn, source,
                        housenumber, unit, street, suburb, city, postcode,
                        ST_AsGeoJSON(point_wgs84) as geometry
                    FROM osm_address
                    WHERE point_wgs84 IS NOT NULL
                ");
            }

            foreach ($addressResults as $row) {
                if (!empty($row->geometry)) {
                    $geometry = json_decode($row->geometry, true);
                    $osmAddresses->push([
                        'type' => 'Feature',
                        'geometry' => $geometry,
                        'properties' => [
                            'id' => $row->id,
                            'building_part_id' => $row->building_part_id,
                            'osm_id' => $row->osm_id,
                            'uprn' => $row->uprn,
                            'source' => $row->source,
                            'housenumber' => $row->housenumber,
                            'unit' => $row->unit,
                            'street' => $row->street,
                            'suburb' => $row->suburb,
                            'city' => $row->city,
                            'postcode' => $row->postcode,
                        ]
                    ]);
                }
            }

            $totalCount = $osmAddresses->count();
            $chunks = $osmAddresses->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Stream OSM Landuse data in chunks
     */
    public function streamOSMLanduseData(Request $request)
    {
        set_time_limit(300);
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        if (!is_array($areaIds)) {
            $areaIds = is_string($areaIds) && str_starts_with($areaIds, '[')
                ? json_decode($areaIds, true)
                : [$areaIds];
        }
        $areaIds = array_map('intval', array_filter($areaIds));
        $includeBuaFilter = $request->input('include_bua_filter', true);
        $chunkSize = $request->input('chunk_size', 100);

        return response()->stream(function () use ($areaIds, $includeBuaFilter, $chunkSize) {
            DB::statement('SET statement_timeout = 180000'); // 3 minutes

            $osmLanduseAreas = collect();

            if ($includeBuaFilter && !empty($areaIds)) {
                $areaIdsString = implode(',', $areaIds);
                $landuseResults = DB::select("
                    SELECT 
                        id, source, osm_id, name, landuse, operator, ref,
                        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
                    FROM osm_landuse_area
                    WHERE geom IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM ons_bua b
                        WHERE b.fid IN ({$areaIdsString})
                        AND ST_INTERSECTS(osm_landuse_area.geom, b.geometry)
                    )
                ");
            } else {
                $landuseResults = DB::select("
                    SELECT 
                        id, source, osm_id, name, landuse, operator, ref,
                        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
                    FROM osm_landuse_area
                    WHERE geom IS NOT NULL
                ");
            }

            foreach ($landuseResults as $row) {
                if (!empty($row->geometry)) {
                    $geometry = json_decode($row->geometry, true);
                    $osmLanduseAreas->push([
                        'type' => 'Feature',
                        'geometry' => $geometry,
                        'properties' => [
                            'id' => $row->id,
                            'source' => $row->source,
                            'osm_id' => $row->osm_id,
                            'name' => $row->name,
                            'landuse' => $row->landuse,
                            'operator' => $row->operator,
                            'ref' => $row->ref,
                        ]
                    ]);
                }
            }

            $totalCount = $osmLanduseAreas->count();
            $chunks = $osmLanduseAreas->chunk($chunkSize);
            $totalChunks = $chunks->count();

            echo "data: " . json_encode([
                'type' => 'metadata',
                'total' => $totalCount,
                'chunkSize' => $chunkSize,
                'totalChunks' => $totalChunks
            ]) . "\n\n";
            ob_flush();
            flush();

            $chunkIndex = 0;
            foreach ($chunks as $chunk) {
                echo "data: " . json_encode([
                    'type' => 'chunk',
                    'chunkIndex' => $chunkIndex,
                    'data' => $chunk->values()->all(),
                    'progress' => round(($chunkIndex + 1) / $totalChunks * 100, 2)
                ]) . "\n\n";

                ob_flush();
                flush();
                $chunkIndex++;
                usleep(10000);
            }

            echo "data: " . json_encode([
                'type' => 'complete',
                'total' => $totalCount
            ]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function validateBuilding(Request $request)
    {
        return $this->performValidation(Building::class, $request->input('geojson'));
    }

    public function validateSite(Request $request)
    {
        return $this->performValidation(Site::class, $request->input('geojson'));
    }

    public function validateNhle(Request $request)
    {
        return $this->performValidation(NHLE::class, $request->input('geojson'));
    }

    public function validateBuildingPart(Request $request)
    {
        return $this->performValidation(BuildingPartV2::class, $request->input('geojson'));
    }

    public function validateEpcCertificate(Request $request)
    {
        $data_json = $request->input('geojson');
        $results = [];

        // Validate JSON structure
        if (!isset($data_json['column-names']) || !isset($data_json['rows'])) {
            return response()->json([
                'results' => [],
                'error' => 'Invalid EPC Certificate format. Expected "column-names" and "rows" properties.'
            ], 400);
        }

        $columnNames = $data_json['column-names'];
        $rows = $data_json['rows'];

        // Validate each row
        foreach ($rows as $index => $row) {
            // Normalize kebab-case keys to snake_case
            $normalizedRow = [];
            foreach ($row as $key => $value) {
                $normalizedKey = str_replace('-', '_', $key);
                $normalizedRow[$normalizedKey] = $value;
            }

            $lmkKey = $normalizedRow['lmk_key'] ?? null;
            $address = $normalizedRow['address'] ?? null;

            // Check if record already exists
            $exists = EpcCertificate::where('lmk_key', $lmkKey)->exists();

            $status = 'ok';
            $message = 'Ready to import';

            if ($exists) {
                $status = 'duplicate';
                $message = "EPC Certificate with lmk_key '{$lmkKey}' already exists";
            }

            if (!$lmkKey) {
                $status = 'error';
                $message = 'Missing required field: lmk_key';
            }

            $results[] = [
                'feature_index' => $index,
                'lmk_key' => $lmkKey,
                'address' => $address,
                'status' => $status,
                'message' => $message,
                'properties' => $normalizedRow // Use normalized keys
            ];
        }

        return response()->json(['results' => $results]);
    }

    private function performValidation($modelClass, $geojson)
    {
        $results = [];

        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['results' => []]);
        }

        foreach ($geojson['features'] as $index => $feature) {
            if (!isset($feature['geometry']) || !isset($feature['properties'])) {
                continue;
            }

            $osid = $feature['properties']['osid'] ?? null;
            $gid = $feature['properties']['gid'] ?? $feature['properties']['ListEntry'] ?? null;
            $geometry = json_encode($feature['geometry']);
            $srid = $geojson['crs']['properties']['name'] ?? 'EPSG:4326';
            $sridNumber = (int) filter_var($srid, FILTER_SANITIZE_NUMBER_INT);

            $featureData = [
                'feature_index' => $index,
                'properties' => $feature['properties'],
                'status' => 'ok',
                'details' => 'Ready to import.',
                'existing_osid' => null
            ];

            // --- Validation Checks ---

            // 1. OSID Check
            if (!$osid && $modelClass != NHLE::class) {
                $featureData['status'] = 'missing_osid';
                $featureData['details'] = 'Missing OSID or List Entry. Import will be skipped.';
                $results[] = $featureData;
                continue;
            } else if (!$gid && $modelClass == NHLE::class) {
                $featureData['status'] = 'missing_gid';
                $featureData['details'] = 'Missing List Entry. Import will be skipped.';
                $results[] = $featureData;
                continue;
            }

            if ($modelClass == NHLE::class) {
                $existingItemBygid = $modelClass::where('gid', $gid)->first();
                if ($existingItemBygid) {
                    $featureData['status'] = 'duplicate';
                    $featureData['details'] = "Duplicate List Entry: Matches existing item with List Entry '{$gid}'.";
                    $featureData['existing_gid'] = $existingItemBygid->gid;
                    $results[] = $featureData;
                    continue;
                }
            } else if ($modelClass == BuildingPartV2::class) {
                $existingItemBygid = $modelClass::where('osid', $osid)->first();
                if ($existingItemBygid) {
                    $featureData['status'] = 'duplicate';
                    $featureData['details'] = "Duplicate OSID: Matches existing item with OSID '{$osid}'.";
                    $featureData['existing_osid'] = $existingItemBygid->osid;
                    $results[] = $featureData;
                    continue;
                }
            } else {
                $existingItemByOsid = $modelClass::where('osid', $osid)->first();
                if ($existingItemByOsid) {
                    $featureData['status'] = 'duplicate';
                    $featureData['details'] = "Duplicate OSID: Matches existing item with OSID '{$osid}'.";
                    $featureData['existing_osid'] = $existingItemByOsid->osid;
                    $results[] = $featureData;
                    continue;
                }
            }


            // 2. Exact Geometry Check
            if ($modelClass != NHLE::class) {
                $geomSql = "ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700)";
                $exactMatch = $modelClass::whereRaw("ST_Equals(geometry, {$geomSql})", [$geometry, $sridNumber])->first();
                if ($exactMatch) {
                    $featureData['status'] = 'exact_match';
                    $featureData['details'] = "Exact Geometry: Matches existing item (OSID: {$exactMatch->osid}).";
                    $results[] = $featureData;
                    continue;
                }
            }

            // 3. Spatial Overlap Check with Tolerance
            if ($modelClass != NHLE::class) {
                $overlapTolerance = 0.1; // meters squared
                $overlappingItem = $modelClass::select('osid')
                    ->selectRaw("ST_Area(ST_Intersection(geometry, {$geomSql})) as overlap_area", [$geometry, $sridNumber])
                    ->whereRaw("ST_Intersects(geometry, {$geomSql})", [$geometry, $sridNumber])
                    ->orderBy('overlap_area', 'desc')
                    ->first();

                if ($overlappingItem && $overlappingItem->overlap_area > $overlapTolerance) {
                    $featureData['status'] = 'overlap';
                    $featureData['details'] = sprintf(
                        "Spatial Overlap: Overlaps with OSID %s by %.2f m².",
                        $overlappingItem->osid,
                        $overlappingItem->overlap_area
                    );
                    $results[] = $featureData;
                    continue;
                }
            }

            $results[] = $featureData;
        }

        return response()->json(['results' => $results]);
    }

    public function importBuilding(Request $request)
    {
        return $this->performImport(Building::class, $request);
    }

    public function importSite(Request $request)
    {
        return $this->performImport(Site::class, $request);
    }

    public function importNhle(Request $request)
    {
        return $this->performImport(NHLE::class, $request);
    }

    public function importBuildingPart(Request $request)
    {
        return $this->performImport(BuildingPartV2::class, $request);
    }

    public function importEpcCertificate(Request $request)
    {
        $rows = $request->input('rows');
        if (!$rows || !is_array($rows)) {
            return response()->json(['error' => 'Invalid row data provided.'], 400);
        }

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($rows as $item) {
                $action = $item['action'] ?? 'skip';
                $data = $item['data'] ?? [];

                if ($action === 'skip') {
                    $skippedCount++;
                    continue;
                }

                //set address to null
                $data['address'] = null;
                $data['address1'] = null;
                $data['address2'] = null;
                $data['address3'] = null;
                $data['postcode'] = null;

                // Validate required field
                if (empty($data['lmk_key'])) {
                    $errors[] = "Row skipped: missing lmk_key";
                    $skippedCount++;
                    continue;
                }

                // Prepare data for insert/update (remove non-fillable fields)
                $fillableData = array_intersect_key($data, array_flip((new EpcCertificate())->getFillable()));
                $fillableData['data_jsonb'] = json_encode($data);

                if ($action === 'import') {
                    // Insert new record
                    EpcCertificate::create($fillableData);
                    $importedCount++;
                } elseif ($action === 'update') {
                    // Update existing record
                    $updated = EpcCertificate::where('lmk_key', $data['lmk_key'])
                        ->update($fillableData);
                    if ($updated) {
                        $updatedCount++;
                    } else {
                        $errors[] = "Failed to update record with lmk_key: {$data['lmk_key']}";
                    }
                }
            }

            DB::commit();

            $message = "Import completed: {$importedCount} imported, {$updatedCount} updated, {$skippedCount} skipped.";
            if (!empty($errors)) {
                $message .= " Errors: " . implode('; ', $errors);
            }

            return response()->json([
                'message' => $message,
                'imported' => $importedCount,
                'updated' => $updatedCount,
                'skipped' => $skippedCount,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('EPC Certificate import failed: ' . $e->getMessage());
            return response()->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }

    public function validateUprn(Request $request)
    {
        $results = [];
        $geojson = $request->input('geojson');
        $maxJoinRadiusMeters = (int)($request->input('join_radius_m', 30));
        if ($maxJoinRadiusMeters < 10) {
            $maxJoinRadiusMeters = 10;
        }
        if ($maxJoinRadiusMeters > 30) {
            $maxJoinRadiusMeters = 30;
        }

        if (!$geojson || !isset($geojson['features']) || !is_array($geojson['features'])) {
            return response()->json(['results' => []]);
        }

        $seenUprns = [];
        foreach ($geojson['features'] as $index => $feature) {
            $properties = $feature['properties'] ?? [];
            $geometry = $feature['geometry'] ?? null;

            $uprn = $properties['UPRN'] ?? $properties['uprn'] ?? null;
            $latitude = $properties['LATITUDE'] ?? $properties['latitude'] ?? null;
            $longitude = $properties['LONGITUDE'] ?? $properties['longitude'] ?? null;

            $featureData = [
                'feature_index' => $index,
                'properties' => [
                    'uprn' => $uprn,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ],
                'status' => 'ok',
                'details' => 'Ready to import.',
                'audit' => [
                    'link_method' => null,
                    'confidence' => null,
                    'nearest_site' => null,
                    'nearest_building' => null,
                ],
            ];

            // Rule 1: Schema - UPRN numeric & non-null
            if (is_null($uprn) || !is_numeric($uprn)) {
                $featureData['status'] = 'warning';
                $featureData['details'] = 'Invalid UPRN: must be numeric and non-null.';
                $results[] = $featureData;
                continue;
            }

            // Rule 3: Duplicates - within batch
            if (isset($seenUprns[$uprn])) {
                $featureData['status'] = 'duplicate_in_batch';
                $featureData['details'] = 'Duplicate UPRN within this upload batch; only one row per UPRN is allowed.';
                $results[] = $featureData;
                continue;
            }
            $seenUprns[$uprn] = true;

            // Existing duplicate in DB
            $existing = Uprn::where('uprn', (int)$uprn)->first();
            if ($existing) {
                $featureData['status'] = 'duplicate_existing';
                $featureData['details'] = "Duplicate UPRN: record already exists (UPRN '{$uprn}'). Re-ingest will only fill missing metadata.";
            }

            // Rule 2: CRS/Geometry - Must be point in EPSG:4326 (accept lat/lon or GeoJSON Point)
            $hasLatLng = (!is_null($latitude) && !is_null($longitude));
            $isPointGeom = (is_array($geometry) && strtoupper((string)($geometry['type'] ?? '')) === 'POINT');
            if (!$hasLatLng && !$isPointGeom) {
                $featureData['status'] = 'warning';
                $featureData['details'] = 'Missing valid point location: supply LATITUDE/LONGITUDE or GeoJSON Point geometry (EPSG:4326).';
                $results[] = $featureData;
                continue;
            }
            if ($hasLatLng) {
                // Basic 4326 bounds check
                if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
                    $featureData['status'] = 'warning';
                    $featureData['details'] = 'Invalid lat/lon range for EPSG:4326.';
                    $results[] = $featureData;
                    continue;
                }
            }

            // Build a 27700 point for spatial validation and joins
            $point27700 = null;
            try {
                if ($hasLatLng) {
                    $pt = DB::selectOne(
                        "SELECT ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 27700) AS g",
                        [(float)$longitude, (float)$latitude]
                    );
                    $point27700 = $pt ? $pt->g : null;
                } elseif ($isPointGeom) {
                    $geomJson = json_encode($geometry);
                    $pt = DB::selectOne(
                        "SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700) AS g",
                        [$geomJson]
                    );
                    $point27700 = $pt ? $pt->g : null;
                }
            } catch (\Exception $e) {
                $point27700 = null;
            }

            if (!$point27700) {
                $featureData['status'] = 'warning';
                $featureData['details'] = 'Failed to construct spatial point for validation.';
                $results[] = $featureData;
                continue;
            }

            // Rules 4,5,6,7: Nearest-neighbour join to sites/buildings within capped radius; audit method & confidence; index-friendly queries
            try {
                // Nearest Site
                $nearestSite = DB::selectOne(
                    "SELECT osid, ST_Distance(s.geometry, g.geom) AS dist
                     FROM lus_fts_site s
                     JOIN (SELECT ?::geometry AS geom) AS g ON TRUE
                     WHERE ST_DWithin(s.geometry, g.geom, ?) 
                     ORDER BY s.geometry <-> g.geom
                     LIMIT 1",
                    [$point27700, $maxJoinRadiusMeters]
                );

                // Nearest Building
                $nearestBld = DB::selectOne(
                    "SELECT osid, ST_Distance(b.geometry, g.geom) AS dist
                     FROM bld_fts_building b
                     JOIN (SELECT ?::geometry AS geom) AS g ON TRUE
                     WHERE ST_DWithin(b.geometry, g.geom, ?) 
                     ORDER BY b.geometry <-> g.geom
                     LIMIT 1",
                    [$point27700, $maxJoinRadiusMeters]
                );

                $featureData['audit']['nearest_site'] = $nearestSite ? ['osid' => $nearestSite->osid, 'distance_m' => (float)$nearestSite->dist] : null;
                $featureData['audit']['nearest_building'] = $nearestBld ? ['osid' => $nearestBld->osid, 'distance_m' => (float)$nearestBld->dist] : null;

                $featureData['audit']['link_method'] = 'nearest_neighbour_within_radius';
                $minDist = null;
                if ($nearestSite) {
                    $minDist = is_null($minDist) ? (float)$nearestSite->dist : min($minDist, (float)$nearestSite->dist);
                }
                if ($nearestBld) {
                    $minDist = is_null($minDist) ? (float)$nearestBld->dist : min($minDist, (float)$nearestBld->dist);
                }
                if (!is_null($minDist)) {
                    if ($minDist <= 10) $featureData['audit']['confidence'] = 'high';
                    elseif ($minDist <= 20) $featureData['audit']['confidence'] = 'medium';
                    else $featureData['audit']['confidence'] = 'low';
                } else {
                    $featureData['audit']['confidence'] = 'none';
                }
            } catch (\Exception $e) {
                // If spatial join fails, keep validation status but note no link
                $featureData['audit']['link_method'] = 'nearest_neighbour_within_radius';
                $featureData['audit']['confidence'] = 'none';
            }

            // Rule 8: Re-ingest safety hint
            if ($existing) {
                $featureData['reingest_policy'] = 'fill_missing_only';
            } else {
                $featureData['reingest_policy'] = 'insert_new_requires_xy_present';
            }

            $results[] = $featureData;
        }

        return response()->json(['results' => $results]);
    }

    public function importUprn(Request $request)
    {
        $features = $request->input('features');
        $sridNumber = $request->input('srid', 4326) ?? 4326;
        $maxJoinRadiusMeters = (int)($request->input('join_radius_m', 30));
        if ($maxJoinRadiusMeters < 1) {
            $maxJoinRadiusMeters = 10;
        }
        if ($maxJoinRadiusMeters > 30) {
            $maxJoinRadiusMeters = 30;
        }

        if (!$features || !is_array($features)) {
            return response()->json(['error' => 'Invalid feature data provided.'], 400);
        }

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($features as $featureAction) {
                $action = $featureAction['action'] ?? 'skip';
                $data = $featureAction['feature'] ?? $featureAction['data'] ?? null;

                if (!$data || $action === 'skip') {
                    continue;
                }

                $props = $data['properties'] ?? [];
                $uprnVal = $props['UPRN'] ?? $props['uprn'] ?? null;
                // Validation Rule 1: Schema -> uprn numeric, unique, non-null
                if (is_null($uprnVal) || !is_numeric($uprnVal)) {
                    $skippedCount++;
                    continue;
                }

                $attributes = [
                    'uprn' => (int)$uprnVal,
                    'x_coordinate' => isset($props['EASTING']) ? (float)$props['EASTING'] : (isset($props['x_coordinate']) ? (float)$props['x_coordinate'] : null),
                    'y_coordinate' => isset($props['NORTHING']) ? (float)$props['NORTHING'] : (isset($props['y_coordinate']) ? (float)$props['y_coordinate'] : null),
                    'latitude' => isset($props['LATITUDE']) ? (float)$props['LATITUDE'] : (isset($props['latitude']) ? (float)$props['latitude'] : null),
                    'longitude' => isset($props['LONGITUDE']) ? (float)$props['LONGITUDE'] : (isset($props['longitude']) ? (float)$props['longitude'] : null),
                ];

                // Validation Rule 2: CRS/Geometry -> Must be valid POINT in EPSG:4326 (accept lat/lng or GeoJSON Point)
                $hasLatLng = (!is_null($attributes['latitude']) && !is_null($attributes['longitude']));
                $hasGeometryPoint = false;
                if (isset($data['geometry']) && is_array($data['geometry'])) {
                    $geomType = $data['geometry']['type'] ?? null;
                    if (strtoupper((string)$geomType) === 'POINT') {
                        $hasGeometryPoint = true;
                    }
                }
                if (!$hasLatLng && !$hasGeometryPoint && is_null($attributes['x_coordinate']) && is_null($attributes['y_coordinate'])) {
                    // No way to locate the UPRN spatially -> skip
                    $skippedCount++;
                    continue;
                }

                // Build geometry expression separately to avoid model casts interfering
                $geomExpr = null;
                if (isset($data['geometry'])) {
                    $geomJson = json_encode($data['geometry']);
                    $geomExpr = DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('" . $geomJson . "'), {$sridNumber}), 27700)");
                } elseif (!empty($attributes['x_coordinate']) && !empty($attributes['y_coordinate'])) {
                    $geomExpr = DB::raw("ST_SetSRID(ST_MakePoint({$attributes['x_coordinate']}, {$attributes['y_coordinate']}), 27700)");
                } elseif (!empty($attributes['longitude']) && !empty($attributes['latitude'])) {
                    $geomExpr = DB::raw("ST_Transform(ST_SetSRID(ST_MakePoint({$attributes['longitude']}, {$attributes['latitude']}), 4326), 27700)");
                }

                // Ensure x_coordinate and y_coordinate are populated to satisfy NOT NULL constraints
                if ((is_null($attributes['x_coordinate']) || is_null($attributes['y_coordinate']))) {
                    try {
                        if (!empty($attributes['longitude']) && !empty($attributes['latitude'])) {
                            $point = DB::selectOne(
                                "SELECT ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 27700)) AS x, ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 27700)) AS y",
                                [
                                    (float)$attributes['longitude'],
                                    (float)$attributes['latitude'],
                                    (float)$attributes['longitude'],
                                    (float)$attributes['latitude']
                                ]
                            );
                            if ($point) {
                                $attributes['x_coordinate'] = (float)$point->x;
                                $attributes['y_coordinate'] = (float)$point->y;
                            }
                        } elseif (isset($data['geometry'])) {
                            $geomJson = json_encode($data['geometry']);
                            $point = DB::selectOne(
                                "SELECT ST_X(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), {$sridNumber}), 27700)) AS x, ST_Y(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), {$sridNumber}), 27700)) AS y",
                                [$geomJson, $geomJson]
                            );
                            if ($point) {
                                $attributes['x_coordinate'] = (float)$point->x;
                                $attributes['y_coordinate'] = (float)$point->y;
                            }
                        }
                    } catch (\Exception $e) {
                        // If computation fails, continue; DB constraint may still fail and be caught by outer try/catch
                    }
                }

                // Validation Rule 8: Re-ingest safety -> do not overwrite better metadata
                // Merge with existing record: only fill missing values, never overwrite non-null with null
                $existing = Uprn::where('uprn', (int)$uprnVal)->first();
                if ($existing) {
                    $update = [];
                    foreach (['x_coordinate', 'y_coordinate', 'latitude', 'longitude'] as $field) {
                        if (!is_null($attributes[$field]) && (is_null($existing->{$field}) || $existing->{$field} === 0.0)) {
                            $update[$field] = $attributes[$field];
                        }
                    }
                    if (!empty($update)) {
                        Uprn::where('uprn', (int)$uprnVal)->update($update);
                        $updatedCount++;
                    } else {
                        // Nothing to update
                        $skippedCount++;
                    }
                } else {
                    // Ensure x/y present before insert to satisfy NOT NULL constraints
                    if (is_null($attributes['x_coordinate']) || is_null($attributes['y_coordinate'])) {
                        $skippedCount++;
                        continue;
                    }
                    $instance = Uprn::create($attributes);
                    $importedCount++;
                }

                // Then set geom via Query Builder using raw expression
                if ($geomExpr) {
                    DB::table('osopenuprn_address')
                        ->where('uprn', (int)$uprnVal)
                        ->update(['geom' => $geomExpr]);
                }

                // Note: counts already adjusted above to reflect re-ingest safety
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during import: ' . $e->getMessage()], 500);
        }

        // Clear caches
        try {
            \Artisan::call('optimize:clear');
            \Artisan::call('cache:clear');
            \Artisan::call('config:clear');
            \Artisan::call('route:clear');
            \Artisan::call('view:clear');
            if (config('cache.default') === 'redis') {
                \Cache::flush();
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to clear cache after UPRN import: ' . $e->getMessage());
        }

        return response()->json(['message' => "Import finished. {$importedCount} imported, {$updatedCount} updated, {$skippedCount} skipped. Cache cleared."]);
    }

    public function validateLandRegistryCadastral(Request $request)
    {
        @ini_set('upload_max_size', '256M');
        @ini_set('post_max_size', '256M');
        @ini_set('max_execution_time', '300');

        $geojson = $request->input('geojson');

        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['error' => 'Invalid GeoJSON data provided.'], 400);
        }

        $results = [];
        foreach ($geojson['features'] as $index => $feature) {
            if (!isset($feature['geometry']) || !isset($feature['properties'])) {
                continue;
            }

            $properties = $feature['properties'];
            $globalId = $properties['GlobalID'] ?? $properties['global_id'] ?? null;

            $status = 'ok';
            $details = 'Ready for import';
            $existingGlobalId = null;

            // Check for duplicate global_id
            if ($globalId) {
                $existing = LandRegistryCadastral::where('global_id', $globalId)->first();
                if ($existing) {
                    $status = 'duplicate';
                    $details = 'Global ID already exists in database';
                    $existingGlobalId = $globalId;
                }
            } else {
                $status = 'warning';
                $details = 'Missing Global ID';
            }

            // Check for spatial overlaps if geometry exists
            if (isset($feature['geometry']) && $status === 'ok') {
                $geometry = json_encode($feature['geometry']);
                $srid = $geojson['crs']['properties']['name'] ?? 'EPSG:4326';
                $sridNumber = (int) filter_var($srid, FILTER_SANITIZE_NUMBER_INT);

                // Check for exact geometry match
                $exactMatch = LandRegistryCadastral::whereRaw(
                    "ST_Equals(geometry, ST_SetSRID(ST_GeomFromGeoJSON(?), ?))",
                    [$geometry, $sridNumber]
                )->exists();

                if ($exactMatch) {
                    $status = 'exact_match';
                    $details = 'Exact geometry match found';
                } else {
                    // Check for spatial overlap
                    $overlap = LandRegistryCadastral::whereRaw(
                        "ST_Intersects(geometry, ST_SetSRID(ST_GeomFromGeoJSON(?), ?)) AND NOT ST_Equals(geometry, ST_SetSRID(ST_GeomFromGeoJSON(?), ?))",
                        [$geometry, $sridNumber, $geometry, $sridNumber]
                    )->exists();

                    if ($overlap) {
                        $status = 'overlap';
                        $details = 'Spatial overlap detected';
                    }
                }
            }

            $results[] = [
                'feature_index' => $index,
                'properties' => $properties,
                'status' => $status,
                'details' => $details,
                'existing_global_id' => $existingGlobalId,
            ];
        }

        return response()->json(['results' => $results]);
    }

    public function importLandRegistryCadastral(Request $request)
    {
        @ini_set('upload_max_size', '256M');
        @ini_set('post_max_size', '256M');
        @ini_set('max_execution_time', '300');

        $features = $request->input('features');
        $sridNumber = $request->input('srid', 4326) ?? 4326;

        if (!$features || !is_array($features)) {
            return response()->json(['error' => 'Invalid feature data provided.'], 400);
        }

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($features as $featureAction) {
                $action = $featureAction['action'] ?? 'skip';
                $data = $featureAction['data'] ?? null;

                if (!$data || $action === 'skip') {
                    $skippedCount++;
                    continue;
                }

                $properties = $data['properties'] ?? [];
                $geometry = $data['geometry'] ?? null;

                $globalId = $properties['GlobalID'] ?? $properties['global_id'] ?? $properties['GLOBAL_ID'] ?? null;

                // Skip if no global_id
                if (!$globalId) {
                    $skippedCount++;
                    continue;
                }

                // Prepare attributes based on the LandRegistryCadastral model structure
                $attributes = [
                    'global_id' => $globalId,
                    'fid' => $properties['FID'] ?? $properties['fid'] ?? null,
                    'county_code' => $properties['CTY24CD'] ?? $properties['county_code'] ?? $properties['COUNTY_CODE'] ?? null,
                    'county_name' => $properties['CTY24NM'] ?? $properties['county_name'] ?? $properties['COUNTY_NAME'] ?? null,
                    'bng_easting' => isset($properties['BNG_E']) ? (float)$properties['BNG_E'] : (isset($properties['bng_easting']) ? (float)$properties['bng_easting'] : (isset($properties['BNG_EASTING']) ? (float)$properties['BNG_EASTING'] : null)),
                    'bng_northing' => isset($properties['BNG_N']) ? (float)$properties['BNG_N'] : (isset($properties['bng_northing']) ? (float)$properties['bng_northing'] : (isset($properties['BNG_NORTHING']) ? (float)$properties['BNG_NORTHING'] : null)),
                    'longitude' => isset($properties['LONG']) ? (float)$properties['LONG'] : (isset($properties['longitude']) ? (float)$properties['longitude'] : (isset($properties['LONGITUDE']) ? (float)$properties['LONGITUDE'] : null)),
                    'latitude' => isset($properties['LAT']) ? (float)$properties['LAT'] : (isset($properties['latitude']) ? (float)$properties['latitude'] : (isset($properties['LATITUDE']) ? (float)$properties['LATITUDE'] : null)),
                ];

                // Create/update record first without geometry
                if ($action === 'update') {
                    // Update existing record
                    $existing = LandRegistryCadastral::where('global_id', $globalId)->first();
                    if ($existing) {
                        $existing->update($attributes);
                        $updatedCount++;
                    } else {
                        // If record doesn't exist, create it
                        $instance = LandRegistryCadastral::create($attributes);
                        $importedCount++;
                    }
                } else {
                    // Import new record
                    $instance = LandRegistryCadastral::updateOrCreate(
                        ['global_id' => $globalId],
                        $attributes
                    );
                    $importedCount++;
                }

                // Handle geometry separately using raw SQL
                if ($geometry && !empty($geometry['coordinates']) && $geometry['type'] === 'MultiPolygon') {
                    $geometryJson = json_encode($geometry);

                    // Insert WGS84 geometry (EPSG:4326) - original coordinates from GeoJSON
                    DB::statement(
                        "UPDATE land_registry_cadastral SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) WHERE fid = ? AND county_code = ?",
                        [$geometryJson, $properties['FID'], $properties['CTY24CD']]
                    );

                    // Convert and store BNG geometry (EPSG:27700) if BNG coordinates are available
                    if ($properties['BNG_E'] && $properties['BNG_N']) {
                        // Transform WGS84 geometry to BNG
                        DB::statement(
                            "UPDATE land_registry_cadastral SET geometry_bng = ST_Transform(geometry, 27700) WHERE fid = ? AND county_code = ?",
                            [$properties['FID'], $properties['CTY24CD']]
                        );
                    }
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during import: ' . $e->getMessage()], 500);
        }

        // Clear caches
        try {
            \Artisan::call('optimize:clear');
            \Artisan::call('cache:clear');
            \Artisan::call('config:clear');
            \Artisan::call('route:clear');
            \Artisan::call('view:clear');
            if (config('cache.default') === 'redis') {
                \Cache::flush();
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to clear cache after Land Registry import: ' . $e->getMessage());
        }

        return response()->json(['message' => "Import finished. {$importedCount} imported, {$updatedCount} updated, {$skippedCount} skipped. Cache cleared."]);
    }

    private function performImport($modelClass, Request $request)
    {
        $features = $request->input('features');
        $sridNumber = $request->input('srid', 4326) ?? 4326;

        if (!$features || !is_array($features)) {
            return response()->json(['error' => 'Invalid feature data provided.'], 400);
        }

        $importedCount = 0;
        $updatedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($features as $featureAction) {
                $action = $featureAction['action'] ?? 'skip';
                // Support both 'feature' (from frontend) and 'data' (legacy)
                $data = $featureAction['feature'] ?? $featureAction['data'] ?? null;

                if (!$data || $action === 'skip') {
                    continue;
                }

                if ($action === 'import' || $action === 'update') {
                    $osid = $data['properties']['osid'] ?? null;

                    // For NHLE, try to get gid from multiple possible field names
                    $gid = null;
                    if ($modelClass == NHLE::class) {
                        $gid = $data['properties']['gid'] ?? $data['properties']['ListEntry'] ?? $data['properties']['listentry'] ?? null;
                    }

                    if (!$osid && $modelClass != NHLE::class) {
                        continue;
                    } else if (!$gid && $modelClass == NHLE::class) {
                        continue;
                    }
                    $isUpdate = ($action === 'update');

                    $model = new $modelClass;
                    $fillable = $model->getFillable();
                    $attributes = [];

                    foreach ($fillable as $field) {
                        if (in_array($field, ['osid', 'geometry'])) {
                            continue;
                        }

                        $value = $data['properties'][$field] ?? null;

                        if (is_null($value)) {
                            $nonNullableFields = [
                                'versiondate',
                                'changetype',
                                'geometry_area_m2',
                                'geometry_updatedate',
                                'geometry_capturemethod',
                                'theme',
                                'description',
                                'description_updatedate',
                                'description_capturemethod',
                                'oslandcovertiera',
                                'oslandcovertierb',
                                'oslandcover_updatedate',
                                'oslandcover_capturemethod',
                                'oslandusetiera',
                                'oslanduse_updatedate',
                                'oslanduse_capturemethod',
                                'isobscured',
                                'physicallevel',
                                'capturespecification',
                                'containingsitecount',
                                'lowertierlocalauthority_count'
                            ];

                            if (in_array($field, $nonNullableFields)) {
                                if (str_contains($field, 'date')) {
                                    $value = '1970-01-01';
                                } elseif (in_array($field, ['geometry_area_m2', 'containingsitecount'])) {
                                    $value = 0;
                                } elseif ($field === 'isobscured') {
                                    $value = false;
                                } elseif ($field === 'lowertierlocalauthority_count') {
                                    $value = 0;
                                } else {
                                    $value = '';
                                }
                            }
                        }

                        $array_fields = ['oslandusetierb', 'oslandcovertierb', 'largestsite_landusetierb', 'smallestsite_landusetierb'];
                        if (in_array($field, $array_fields) && is_array($value)) {
                            $attributes[$field] = json_encode($value);
                        } else {
                            $attributes[$field] = $value;
                        }
                    }

                    if (isset($data['geometry'])) {
                        $attributes['geometry'] = DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('" . json_encode($data['geometry']) . "'), {$sridNumber}), 27700)");
                    }

                    if ($modelClass == NHLE::class) {
                        $instance = $modelClass::updateOrCreate(['gid' => $gid], $attributes);
                    } else {
                        $instance = $modelClass::updateOrCreate(['osid' => $osid], $attributes);
                    }

                    if ($modelClass === Site::class && isset($data['properties']['sitetoaddressreference']) && is_array($data['properties']['sitetoaddressreference'])) {
                        // Delete existing references to handle updates cleanly
                        SiteAddressReference::where('siteid', $instance->osid)->delete();

                        foreach ($data['properties']['sitetoaddressreference'] as $ref) {
                            SiteAddressReference::create([
                                'uprn' => $ref['uprn'],
                                'siteid' => $ref['siteid'],
                                'siteversiondate' => $ref['siteversiondate'],
                                'relationshiptype' => $ref['relationshiptype'],
                            ]);
                        }
                    }

                    if ($modelClass === Building::class) {
                        // Handle sitereference
                        if (isset($data['properties']['sitereference']) && is_array($data['properties']['sitereference'])) {
                            BuildingSiteLink::where('buildingid', $instance->osid)->delete();
                            foreach ($data['properties']['sitereference'] as $ref) {
                                BuildingSiteLink::create([
                                    'siteid' => $ref['siteid'],
                                    'buildingid' => $ref['buildingid'],
                                    'buildingversiondate' => $ref['buildingversiondate'],
                                ]);
                            }
                        }

                        // Handle uprnreference
                        if (isset($data['properties']['uprnreference']) && is_array($data['properties']['uprnreference'])) {
                            BuildingAddress::where('buildingid', $instance->osid)->delete();
                            foreach ($data['properties']['uprnreference'] as $ref) {
                                BuildingAddress::create([
                                    'uprn' => $ref['uprn'],
                                    'buildingid' => $ref['buildingid'],
                                    'buildingversiondate' => $ref['buildingversiondate'],
                                ]);
                            }
                        }

                        // Handle buildingpartreference
                        if (isset($data['properties']['buildingpartreference']) && is_array($data['properties']['buildingpartreference'])) {
                            BuildingPartLink::where('buildingid', $instance->osid)->delete();
                            foreach ($data['properties']['buildingpartreference'] as $ref) {
                                BuildingPartLink::create([
                                    'buildingpartid' => $ref['buildingpartid'],
                                    'buildingid' => $ref['buildingid'],
                                    'buildingversiondate' => $ref['buildingversiondate'],
                                ]);
                            }
                        }
                    }
                    if ($modelClass === BuildingPartV2::class) {
                        if (isset($data['properties']['sitereference']) && is_array($data['properties']['sitereference'])) {
                            BuildingPartSiteRefV2::where('buildingpartid', $instance->osid)->delete();
                            foreach ($data['properties']['sitereference'] as $ref) {
                                if (empty($ref['buildingpartid'])) {
                                    continue;
                                }
                                BuildingPartSiteRefV2::create([
                                    'siteid' => $ref['siteid'],
                                    'buildingpartid' => $ref['buildingpartid'],
                                    'buildingpartversiondate' => $ref['buildingpartversiondate'],
                                ]);
                            }
                        }
                    }

                    if ($modelClass === NHLE::class) {
                        $properties = $data['properties'];
                        $geometry = $data['geometry'];
                        $coordinates = $geometry['coordinates'];

                        $longitude = null;
                        $latitude = null;

                        if ($geometry['type'] === 'Point' && count($coordinates) >= 2) {
                            $longitude = $coordinates[0];
                            $latitude = $coordinates[1];
                        } elseif (($geometry['type'] === 'MultiPoint' || $geometry['type'] === 'Polygon') && !empty($coordinates)) {
                            // For MultiPoint or Polygon, calculate the centroid
                            $points = $geometry['type'] === 'MultiPoint' ? $coordinates : ($coordinates[0] ?? []);
                            if (!empty($points)) {
                                $numPoints = count($points);
                                $sumX = 0;
                                $sumY = 0;
                                foreach ($points as $point) {
                                    if (is_array($point) && count($point) >= 2) {
                                        $sumX += $point[0];
                                        $sumY += $point[1];
                                    }
                                }
                                if ($numPoints > 0) {
                                    $longitude = $sumX / $numPoints;
                                    $latitude = $sumY / $numPoints;
                                }
                            }
                        }

                        // Helper function to get property value case-insensitively
                        $getProperty = function ($key) use ($properties) {
                            // Try exact match first
                            if (isset($properties[$key])) {
                                return $properties[$key];
                            }
                            // Try case-insensitive match
                            foreach ($properties as $propKey => $propValue) {
                                if (strtolower($propKey) === strtolower($key)) {
                                    return $propValue;
                                }
                            }
                            return null;
                        };

                        // Get listentry from either 'listentry', 'ListEntry', or 'gid'
                        $listentry = $getProperty('listentry') ?? $getProperty('ListEntry') ?? $properties['gid'] ?? null;

                        // Parse dates - handle both string dates and formatted dates
                        $parseDate = function ($dateValue) {
                            if (!$dateValue) return null;
                            try {
                                return Carbon::parse($dateValue)->toDateString();
                            } catch (\Exception $e) {
                                return null;
                            }
                        };

                        $nhle = NHLE::updateOrCreate([
                            'gid' => $properties['gid']
                        ], [
                            'objectid' => $getProperty('objectid') ?? $getProperty('OBJECTID'),
                            'listentry' => $listentry,
                            'name' => $getProperty('name') ?? $getProperty('Name'),
                            'grade' => $getProperty('grade') ?? $getProperty('Grade'),
                            'listdate' => $parseDate($getProperty('listdate') ?? $getProperty('ListDate')),
                            'amenddate' => $parseDate($getProperty('amenddate') ?? $getProperty('AmendDate')),
                            'capturesca' => $getProperty('capturescale') ?? $getProperty('CaptureScale'),
                            'hyperlink' => $getProperty('hyperlink'),
                            'ngr' => $getProperty('ngr') ?? $getProperty('NGR'),
                            'easting' => $getProperty('easting') ?? $getProperty('Easting'),
                            'northing' => $getProperty('northing') ?? $getProperty('Northing'),
                            'longitude' => $longitude,
                            'latitude' => $latitude,
                        ]);
                        if (isset($geometry) && !empty($geometry['coordinates'])) {
                            $geomJson = json_encode($geometry);
                            DB::table('nhle_')
                                ->where('gid', $nhle->gid)
                                ->update(['geom' => DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('$geomJson'), 4326), 27700)")]);
                        }
                    }

                    if ($isUpdate) {
                        $updatedCount++;
                    } else {
                        $importedCount++;
                    }
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during import: ' . $e->getMessage()], 500);
        }

        // Clear all caches after successful import
        try {
            \Artisan::call('optimize:clear');
            \Artisan::call('cache:clear');
            \Artisan::call('config:clear');
            \Artisan::call('route:clear');
            \Artisan::call('view:clear');

            if (config('cache.default') === 'redis') {
                \Cache::flush();
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to clear cache after import: ' . $e->getMessage());
        }

        return response()->json(['message' => "Import successful. {$importedCount} new NHLEs imported, {$updatedCount} NHLEs updated. Cache cleared."]);
    }

    private function runValidation($geojson)
    {
        $results = [];
        foreach ($geojson['features'] as $index => $feature) {
            if (!isset($feature['geometry']) || !isset($feature['properties'])) {
                continue;
            }

            $warnings = [];
            $osid = $feature['properties']['osid'] ?? 'N/A';
            $geometry = json_encode($feature['geometry']);
            $srid = $geojson['crs']['properties']['name'] ?? 'EPSG:4326';
            $sridNumber = (int) filter_var($srid, FILTER_SANITIZE_NUMBER_INT);

            if ($osid !== 'N/A') {
                if (Building::where('osid', $osid)->exists()) {
                    $warnings[] = "Duplicate OSID";
                }
            }

            if (Building::whereRaw("ST_Equals(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700))", [$geometry, $sridNumber])->exists()) {
                $warnings[] = "Exact Geometry Match";
            }

            if (Building::whereRaw("ST_Intersects(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700))", [$geometry, $sridNumber])->whereRaw("NOT ST_Equals(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700))", [$geometry, $sridNumber])->exists()) {
                $warnings[] = "Spatial Overlap";
            }

            $results[] = [
                'status' => empty($warnings) ? 'ok' : 'warning',
            ];
        }
        return $results;
    }

    public function validateLandRegistryInspire(Request $request)
    {
        @ini_set('upload_max_size', '256M');
        @ini_set('post_max_size', '256M');
        @ini_set('max_execution_time', '300');

        $geojson = $request->input('geojson');
        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['error' => 'Invalid GeoJSON data provided.'], 400);
        }

        $features = collect($geojson['features'])
            ->filter(fn($f) => isset($f['properties']))
            ->values();

        $gmlIds = $features
            ->map(fn($f) => $f['properties']['gml_id'] ?? null)
            ->filter()
            ->unique()
            ->values();

        $existingIds = LandRegistryInspire::whereIn('gml_id', $gmlIds)
            ->pluck('gml_id')
            ->toArray();

        $results = [];
        foreach ($features as $index => $feature) {
            $properties = $feature['properties'] ?? [];
            $gmlId = $properties['gml_id'] ?? null;
            $inspireId = $properties['INSPIREID'] ?? null;

            $status = 'ok';
            $details = 'Ready for import';

            if (!$gmlId) {
                $status = 'warning';
                $details = 'Missing GML ID';
            } elseif (in_array($gmlId, $existingIds)) {
                $status = 'duplicate';
                $details = 'GML ID already exists';
            } elseif (!$inspireId) {
                $status = 'warning';
                $details = 'Missing INSPIRE ID';
            }

            $results[] = [
                'feature_index' => $index,
                'properties' => $properties,
                'status' => $status,
                'details' => $details,
            ];
        }

        return response()->json([
            'summary' => [
                'total' => count($results),
                'duplicates' => count(array_filter($results, fn($r) => $r['status'] === 'duplicate')),
                'warnings' => count(array_filter($results, fn($r) => $r['status'] === 'warning')),
            ],
            'results' => $results,
        ]);
    }

    public function importLandRegistryInspire(Request $request)
    {
        @ini_set('upload_max_size', '256M');
        @ini_set('post_max_size', '256M');
        @ini_set('max_execution_time', '600');

        $features = $request->input('features');
        $sridNumber = $request->input('srid', 4326);

        if (!$features || !is_array($features)) {
            return response()->json(['error' => 'Invalid feature data provided.'], 400);
        }

        $insertBatch = [];
        $updateBatch = [];
        $geometryBatch = [];

        foreach ($features as $featureAction) {
            $action = $featureAction['action'] ?? 'skip';
            $data = $featureAction['data'] ?? null;
            if (!$data || $action === 'skip') continue;

            $p = $data['properties'] ?? [];
            $geometry = $data['geometry'] ?? null;

            $gmlId = $p['gml_id'] ?? null;
            $inspireId = $p['INSPIREID'] ?? null;
            if (!$gmlId || !$inspireId) continue;

            $row = [
                'gml_id' => $gmlId,
                'INSPIREID' => $inspireId,
                'LABEL' => $p['LABEL'] ?? null,
                'NATIONALCADASTRALREFERENCE' => $p['NATIONALCADASTRALREFERENCE'] ?? null,
                'VALIDFROM' => self::parseDate($p['VALIDFROM'] ?? null),
                'BEGINLIFESPANVERSION' => self::parseDate($p['BEGINLIFESPANVERSION'] ?? null),
            ];

            if ($action === 'import') {
                $insertBatch[] = $row;
            } elseif ($action === 'update') {
                $updateBatch[] = $row;
            }

            if ($geometry && !empty($geometry['coordinates'])) {
                $geometryBatch[] = [
                    'gml_id' => $gmlId,
                    'geometry' => json_encode($geometry),
                ];
            }
        }

        DB::beginTransaction();
        try {

            if (!empty($insertBatch)) {
                // DB::table('land_registry_inspire')->upsert($insertBatch, ['gml_id']);
                DB::table('land_registry_inspire')->insertOrIgnore($insertBatch);
            }

            if (!empty($updateBatch)) {
                DB::table('land_registry_inspire')->upsert($updateBatch, ['gml_id'], [
                    'INSPIREID',
                    'LABEL',
                    'NATIONALCADASTRALREFERENCE',
                    'VALIDFROM',
                    'BEGINLIFESPANVERSION'
                ]);
            }

            foreach (array_chunk($geometryBatch, 500) as $chunk) {
                $values = collect($chunk)
                    ->map(
                        fn($g) =>
                        "(" . DB::getPdo()->quote($g['geometry']) . ", " . DB::getPdo()->quote($g['gml_id']) . ")"
                    )->implode(',');

                if ($sridNumber == 27700) {
                    DB::statement("
                        UPDATE land_registry_inspire
                        SET geom = ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(v.geom), 27700), 4326)
                        FROM (VALUES $values) AS v(geom, gml_id)
                        WHERE land_registry_inspire.gml_id = v.gml_id
                    ");
                } else {
                    DB::statement("
                        UPDATE land_registry_inspire
                        SET geom = ST_SetSRID(ST_GeomFromGeoJSON(v.geom), 4326)
                        FROM (VALUES $values) AS v(geom, gml_id)
                        WHERE land_registry_inspire.gml_id = v.gml_id
                    ");
                }
            }

            DB::commit();
            Cache::forget('land_registry_inspire_data');
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => sprintf(
                "Import finished. %d inserted, %d updated. Geometry updated for %d records. Cache cleared.",
                count($insertBatch),
                count($updateBatch),
                count($geometryBatch)
            )
        ]);
    }

    private static function parseDate($value)
    {
        if (!$value) return null;
        try {
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }

    // OSM Building Part validation and import
    public function validateOsmBuildingPart(Request $request)
    {
        return $this->performOsmValidation(\App\Models\OsmBuildingPart::class, $request->input('geojson'));
    }

    public function importOsmBuildingPart(Request $request)
    {
        return $this->performOsmImport(\App\Models\OsmBuildingPart::class, $request);
    }

    // OSM Address validation and import
    public function validateOsmAddress(Request $request)
    {
        return $this->performOsmAddressValidation($request->input('geojson'));
    }

    public function importOsmAddress(Request $request)
    {
        return $this->performOsmAddressImport($request);
    }

    // OSM Landuse Area validation and import
    public function validateOsmLanduseArea(Request $request)
    {
        return $this->performOsmValidation(\App\Models\OsmLanduseArea::class, $request->input('geojson'));
    }

    public function importOsmLanduseArea(Request $request)
    {
        return $this->performOsmImport(\App\Models\OsmLanduseArea::class, $request);
    }

    private function performOsmValidation($modelClass, $geojson)
    {
        $results = [];

        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['results' => []]);
        }

        foreach ($geojson['features'] as $index => $feature) {
            if (!isset($feature['geometry']) || !isset($feature['properties'])) {
                continue;
            }

            $osmId = $feature['properties']['osm_id'] ?? null;
            $geometry = json_encode($feature['geometry']);

            $featureData = [
                'feature_index' => $index,
                'properties' => $feature['properties'],
                'status' => 'ok',
                'details' => 'Ready to import.',
                'existing_osm_id' => null
            ];

            // Check for duplicate OSM ID if provided
            if (!empty($osmId)) {
                // Validate OSM ID format (should only contain positive digits, no minus sign)
                if (!ctype_digit(strval($osmId))) {
                    $featureData['status'] = 'warning';
                    $featureData['details'] = "Invalid OSM ID format: OSM ID '{$osmId}' contains non-numeric characters. OSM IDs should only contain positive digits (0-9).";
                    $results[] = $featureData;
                    continue;
                }

                // Check for duplicate OSM ID
                $existingItem = $modelClass::where('osm_id', $osmId)->first();
                if ($existingItem) {
                    $featureData['status'] = 'duplicate';
                    $featureData['details'] = "Duplicate OSM ID: Matches existing item with OSM ID '{$osmId}'.";
                    $featureData['existing_osm_id'] = $existingItem->osm_id;
                    $results[] = $featureData;
                    continue;
                }
            }

            // Additional validation based on model type
            if ($modelClass === \App\Models\OsmBuildingPart::class) {
                // Building part specific validation
                if (empty($feature['properties']['building']) && empty($feature['properties']['building:part'])) {
                    $featureData['status'] = 'warning';
                    $featureData['details'] = 'No building or building:part tag found.';
                }
            } elseif ($modelClass === \App\Models\OsmLanduseArea::class) {
                // Landuse specific validation
                if (empty($feature['properties']['landuse'])) {
                    $featureData['status'] = 'warning';
                    $featureData['details'] = 'No landuse tag found.';
                }
            }

            $results[] = $featureData;
        }

        return response()->json(['results' => $results]);
    }

    private function performOsmImport($modelClass, Request $request)
    {
        $features = $request->input('features', []);
        $srid = $request->input('srid', 4326);

        if (empty($features)) {
            return response()->json(['error' => 'No features provided for import'], 400);
        }

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;

        // Process each feature individually to prevent one error from aborting all imports
        foreach ($features as $featureData) {
            $action = $featureData['action'] ?? 'import';
            $feature = $featureData['feature'] ?? $featureData;

            if ($action === 'skip') {
                Log::info("OSM feature skipped by user action", [
                    'model' => $modelClass,
                    'osm_id' => $feature['properties']['osm_id'] ?? 'unknown',
                    'reason' => 'user_action_skip'
                ]);
                $skippedCount++;
                continue;
            }

            // Use individual transaction for each record to isolate errors
            try {
                DB::transaction(function () use ($feature, $action, $srid, $modelClass, &$importedCount, &$updatedCount, &$skippedCount) {
                    $properties = $feature['properties'] ?? [];
                    $geometry = $feature['geometry'] ?? null;

                    if (!$geometry) {
                        Log::warning("OSM feature skipped - no geometry", [
                            'model' => $modelClass,
                            'osm_id' => $properties['osm_id'] ?? 'unknown',
                            'reason' => 'missing_geometry',
                            'properties' => $properties
                        ]);
                        $skippedCount++;
                        return;
                    }

                    // Prepare data based on model type
                    $data = $this->prepareOsmData($modelClass, $properties, $geometry, $srid);

                    // Skip if data preparation failed
                    if (empty($data)) {
                        Log::warning("OSM feature skipped - data preparation failed", [
                            'model' => $modelClass,
                            'osm_id' => $properties['osm_id'] ?? 'unknown',
                            'reason' => 'data_preparation_failed',
                            'properties' => $properties,
                            'geometry_type' => $geometry['type'] ?? 'unknown'
                        ]);
                        $skippedCount++;
                        return;
                    }

                    if ($action === 'update' && !empty($properties['osm_id'])) {
                        // Update existing record
                        $existing = $modelClass::where('osm_id', $properties['osm_id'])->first();
                        if ($existing) {
                            $existing->update($data);
                            $updatedCount++;
                        } else {
                            $modelClass::create($data);
                            $importedCount++;
                        }
                    } else {
                        // Create new record
                        $modelClass::create($data);
                        $importedCount++;
                    }
                });
            } catch (\Exception $e) {
                Log::error("OSM feature skipped - import error: " . $e->getMessage(), [
                    'model' => $modelClass,
                    'osm_id' => $feature['properties']['osm_id'] ?? 'unknown',
                    'reason' => 'import_exception',
                    'error_message' => $e->getMessage(),
                    'error_file' => $e->getFile(),
                    'error_line' => $e->getLine(),
                    'feature' => $feature
                ]);
                $skippedCount++;
            }
        }

        // Clear relevant cache
        Cache::flush();

        return response()->json([
            'message' => "Import completed. {$importedCount} imported, {$updatedCount} updated, {$skippedCount} skipped."
        ]);
    }

    private function prepareOsmData($modelClass, $properties, $geometry, $srid)
    {
        $geometryJson = json_encode($geometry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($modelClass === \App\Models\OsmBuildingPart::class) {
            // Transform geometry to BNG (EPSG:27700)
            // Handle MultiPolygon by extracting the largest polygon
            $bngGeometry = DB::selectOne(
                "SELECT ST_AsText(
                    CASE 
                        WHEN ST_GeometryType(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700)) = 'ST_MultiPolygon'
                        THEN (
                            SELECT geom FROM (
                                SELECT (ST_Dump(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700))).geom
                            ) AS dumps
                            ORDER BY ST_Area(geom) DESC
                            LIMIT 1
                        )
                        ELSE ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700)
                    END
                ) as geom",
                [$geometryJson, $geometryJson, $geometryJson]
            )->geom;

            return [
                'source' => 'OSM',
                'osm_id' => $this->parseNumeric($properties['osm_id'] ?? null),
                'name' => $this->parseText($properties['name'] ?? null),
                'geom' => $bngGeometry,

                // UPRN
                'ref_gb_uprn' => $this->parseText(
                    $properties['ref:GB:uprn'] ?? $properties['ref_gb_uprn'] ?? null
                ),

                // Base properties (sesuai ENUM di schema)
                'base_shape' => $this->parseEnum(
                    $properties['base_shape'] ?? null,
                    [
                        'flat',
                        'slope',
                        'pyramidal',
                        'inverted_pyramidal',
                        'dome',
                        'inverted_dome',
                        'round',
                        'inverted_round',
                        'gabled',
                        'gambrel',
                        'segmental_arch',
                        'inverted_segmental_arch',
                        'partial_arch'
                    ]
                ),
                'base_direction' => $this->parseNumeric($properties['base_direction'] ?? null),
                'base_orientation' => $this->parseEnum(
                    $properties['base_orientation'] ?? null,
                    ['along', 'across']
                ),
                'base_height_m' => $this->parseNumeric($properties['base_height_m'] ?? null),
                'base_levels' => $this->parseInteger($properties['base_levels'] ?? null),
                'base_colour' => $this->parseText($properties['building:colour'] ?? null),
                'base_material' => $this->parseText($properties['building:material'] ?? null),
                'base_angle_deg' => $this->parseNumeric($properties['base_angle_deg'] ?? null),

                // Building
                'building' => $this->parseText($properties['building'] ?? null),
                'building_part' => $this->parseText($properties['building:part'] ?? $properties['building_part'] ?? null),
                'building_levels' => $this->parseInteger($properties['building_levels'] ?? $properties['building:levels'] ?? null),
                'building_min_level' => $this->parseInteger($properties['building_min_level'] ?? null),
                'building_levels_underground' => $this->parseInteger($properties['building_levels_underground'] ?? $properties['building:levels:underground'] ?? null),

                // Roof
                'roof_levels' => $this->parseInteger($properties['roof:levels'] ?? null),
                'roof_shape' => $this->parseText($properties['roof:shape'] ?? null),

                // Height
                'height_m' => $this->parseNumeric($properties['height_m'] ?? $properties['height'] ?? null),
                'min_height_m' => $this->parseNumeric($properties['min_height_m'] ?? null),
                'roof_height_m' => $this->parseNumeric($properties['roof:height'] ?? null),

                // Levels
                'levels' => $this->parseInteger($properties['levels'] ?? null),
                'min_level' => $this->parseInteger($properties['min_level'] ?? null),

                // Additional
                'building_reference_number' => $this->parseText($properties['building_reference_number'] ?? null),
                'tenure' => $this->parseText($properties['tenure'] ?? null),
                'construction_age_band' => $this->parseText($properties['construction_age_band'] ?? null),
                'transaction_type' => $this->parseText($properties['transaction_type'] ?? null),
            ];
        } elseif ($modelClass === \App\Models\OsmAddress::class) {
            // Skip if no geometry or not a Point
            if (!$geometry || $geometry['type'] !== 'Point') {
                return [];
            }

            // Extract coordinates
            $coordinates = $geometry['coordinates'];
            if (count($coordinates) < 2) {
                return [];
            }

            $longitude = $coordinates[0];
            $latitude = $coordinates[1];

            // Skip if coordinates are invalid
            if (!is_numeric($longitude) || !is_numeric($latitude)) {
                return [];
            }

            // Find building part ID if provided
            $buildingPartId = $this->extractValue($properties, ['building_part_id']);
            if (!empty($buildingPartId) && is_numeric($buildingPartId)) {
                // Verify building part exists
                if (!\App\Models\OsmBuildingPart::where('id', $buildingPartId)->exists()) {
                    $buildingPartId = null;
                }
            } else {
                $buildingPartId = null;
            }

            // Create WGS84 Point geometry
            $wgs84Point = DB::selectOne(
                "SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) as geom",
                [$longitude, $latitude]
            )->geom;

            return [
                'building_part_id' => $buildingPartId,
                'osm_id' => $this->parseInteger($this->extractValue($properties, ['osm_id'])),
                'uprn' => $this->extractValue($properties, ['uprn']),
                'source' => $this->extractValue($properties, ['source']) ?: 'osm',
                'housenumber' => $this->extractValue($properties, ['housenumber', 'addr:housenumber']),
                'unit' => $this->extractValue($properties, ['unit', 'addr:unit']),
                'street' => $this->extractValue($properties, ['street', 'addr:street']),
                'suburb' => $this->extractValue($properties, ['suburb', 'addr:suburb']),
                'city' => $this->extractValue($properties, ['city', 'addr:city']),
                'postcode' => $this->extractValue($properties, ['postcode', 'addr:postcode']),
                'county' => $this->extractValue($properties, ['county', 'addr:county']),
                'state' => $this->extractValue($properties, ['state', 'addr:state']),
                'country' => $this->extractValue($properties, ['country', 'addr:country']),
                'country_code' => $this->extractValue($properties, ['country_code', 'addr:country_code']),
                'point_wgs84' => $wgs84Point,
            ];
        } elseif ($modelClass === \App\Models\OsmLanduseArea::class) {
            // Transform geometry to BNG (EPSG:27700)
            $bngGeometry = DB::selectOne(
                "SELECT ST_AsText(
                    CASE 
                        WHEN ST_GeometryType(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700)) = 'ST_MultiPolygon'
                        THEN (
                            SELECT geom FROM (
                                SELECT (ST_Dump(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700))).geom
                            ) AS dumps
                            ORDER BY ST_Area(geom) DESC
                            LIMIT 1
                        )
                        ELSE ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700)
                    END
                ) as geom",
                [$geometryJson, $geometryJson, $geometryJson]
            )->geom;

            return [
                'source' => $properties['source'] ?? 'osm',
                'osm_id' => (!empty($properties['osm_id']) && trim($properties['osm_id']) !== '' && is_numeric($properties['osm_id'])) ? (int)$properties['osm_id'] : null,
                'name' => $properties['name'] ?? null,
                'geom' => $bngGeometry,
                'landuse' => $properties['landuse'] ?? 'unknown',
                'operator' => $properties['operator'] ?? null,
                'ref' => $properties['ref'] ?? null,
                'start_date' => $this->parseDate($properties['start_date'] ?? null),
                'opening_date' => $this->parseDate($properties['opening_date'] ?? null),
                'end_date' => $this->parseDate($properties['end_date'] ?? null),
                'tags' => $this->extractAdditionalTags($properties, [
                    'source',
                    'osm_id',
                    'name',
                    'landuse',
                    'operator',
                    'ref',
                    'start_date',
                    'opening_date',
                    'end_date'
                ])
            ];
        }

        return [];
    }

    private function extractAdditionalTags($properties, $excludeFields)
    {
        $tags = [];
        foreach ($properties as $key => $value) {
            if (!in_array($key, $excludeFields) && !empty(trim($value))) {
                $tags[$key] = trim($value);
            }
        }
        return $tags;
    }

    /**
     * Parse text value, return null if empty
     */
    private function parseText($value)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }
        return trim($value);
    }

    /**
     * Parse numeric value, return null if not numeric
     */
    private function parseNumeric($value)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }

    /**
     * Parse integer value, return null if not integer
     */
    private function parseInteger($value)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    /**
     * Parse enum value, return null if not in allowed values
     */
    private function parseEnum($value, $allowedValues)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }

        $value = strtolower(trim($value));

        if (in_array($value, $allowedValues)) {
            return $value;
        }

        return null;
    }

    /**
     * Extract value from properties, trying multiple possible keys
     */
    private function extractValue(array $properties, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (isset($properties[$key]) && !empty(trim($properties[$key]))) {
                return trim($properties[$key]);
            }
        }
        return null;
    }

    /**
     * Check if feature contains address-related keys (keys starting with "addr")
     */
    private function hasAddressKeys(array $properties): bool
    {
        foreach (array_keys($properties) as $key) {
            if (strpos($key, 'addr:') === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extract first coordinate pair from nested coordinate structure
     */
    private function extractFirstCoordinate($coordinates): ?array
    {
        if (!is_array($coordinates)) {
            return null;
        }

        // If it's already a coordinate pair [lng, lat]
        if (count($coordinates) >= 2 && is_numeric($coordinates[0]) && is_numeric($coordinates[1])) {
            return [$coordinates[0], $coordinates[1]];
        }

        // If it's nested, recursively search for first coordinate pair
        foreach ($coordinates as $coord) {
            if (is_array($coord)) {
                $result = $this->extractFirstCoordinate($coord);
                if ($result) {
                    return $result;
                }
            }
        }

        return null;
    }

    /**
     * Custom validation for OSM Address - only process features with address keys
     */
    private function performOsmAddressValidation($geojson)
    {
        $results = [];

        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['results' => []]);
        }

        foreach ($geojson['features'] as $index => $feature) {
            if (!isset($feature['geometry']) || !isset($feature['properties'])) {
                continue;
            }

            // Skip features that don't contain address keys
            if (!$this->hasAddressKeys($feature['properties'])) {
                continue;
            }

            $osmId = $feature['properties']['osm_id'] ?? null;
            $geometry = json_encode($feature['geometry']);

            $featureData = [
                'feature_index' => $index,
                'properties' => $feature['properties'],
                'status' => 'ok',
                'details' => 'Ready to import.',
                'existing_osm_id' => null
            ];

            // Check for duplicate OSM ID if provided
            if (!empty($osmId) && is_numeric($osmId)) {
                $existingItem = \App\Models\OsmAddress::where('osm_id', $osmId)->first();
                if ($existingItem) {
                    $featureData['status'] = 'duplicate';
                    $featureData['details'] = "Duplicate OSM ID: Matches existing item with OSM ID '{$osmId}'.";
                    $featureData['existing_osm_id'] = $existingItem->osm_id;
                    $results[] = $featureData;
                    continue;
                }
            }

            // Address specific validation
            $addressKeys = array_filter(array_keys($feature['properties']), function ($key) {
                return strpos($key, 'addr:') === 0;
            });

            if (empty($addressKeys)) {
                $featureData['status'] = 'warning';
                $featureData['details'] = 'No address tags found. Feature will be skipped.';
            } else {
                $featureData['details'] = 'Contains address tags: ' . implode(', ', $addressKeys);
            }

            $results[] = $featureData;
        }

        return response()->json(['results' => $results]);
    }

    /**
     * Custom import for OSM Address - only import features with address keys
     */
    private function performOsmAddressImport(Request $request)
    {
        $features = $request->input('features', []);
        $srid = $request->input('srid', 4326);

        if (empty($features)) {
            return response()->json(['error' => 'No features provided for import'], 400);
        }

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use ($features, $srid, &$importedCount, &$updatedCount, &$skippedCount) {
            foreach ($features as $featureData) {
                $action = $featureData['action'] ?? 'import';
                $feature = $featureData['feature'] ?? $featureData;

                if ($action === 'skip') {
                    Log::info("OSM Address feature skipped by user action", [
                        'osm_id' => $feature['properties']['osm_id'] ?? 'unknown',
                    ]);
                    $skippedCount++;
                    continue;
                }

                // Skip features that don't contain address keys
                if (!$this->hasAddressKeys($feature['properties'])) {
                    Log::info("OSM Address feature skipped - no address keys", [
                        'osm_id' => $feature['properties']['osm_id'] ?? 'unknown',
                    ]);
                    $skippedCount++;
                    continue;
                }

                try {
                    $properties = $feature['properties'];
                    $geometry = $feature['geometry'];

                    // Extract coordinates from geometry
                    if (!isset($geometry['coordinates'])) {
                        Log::warning("OSM Address feature skipped - no coordinates", [
                            'osm_id' => $properties['osm_id'] ?? 'unknown',
                        ]);
                        $skippedCount++;
                        continue;
                    }

                    $coordinates = $geometry['coordinates'];

                    // Handle different geometry types - extract first coordinate pair
                    if ($geometry['type'] === 'Point') {
                        $longitude = $coordinates[0];
                        $latitude = $coordinates[1];
                    } elseif ($geometry['type'] === 'Polygon' && isset($coordinates[0][0])) {
                        // Use first coordinate of first ring
                        $longitude = $coordinates[0][0][0];
                        $latitude = $coordinates[0][0][1];
                    } elseif ($geometry['type'] === 'LineString' && isset($coordinates[0])) {
                        // Use first coordinate of line
                        $longitude = $coordinates[0][0];
                        $latitude = $coordinates[0][1];
                    } else {
                        // Try to extract from any nested structure
                        $flatCoords = $this->extractFirstCoordinate($coordinates);
                        if (!$flatCoords) {
                            Log::warning("OSM Address feature skipped - cannot extract coordinates", [
                                'osm_id' => $properties['osm_id'] ?? 'unknown',
                                'geometry_type' => $geometry['type'] ?? 'unknown'
                            ]);
                            $skippedCount++;
                            continue;
                        }
                        $longitude = $flatCoords[0];
                        $latitude = $flatCoords[1];
                    }

                    // Create geometry using PostGIS ST_MakePoint
                    $point = DB::selectOne(
                        "SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) as geom",
                        [$longitude, $latitude]
                    )->geom;

                    $addressData = [
                        'source' => $this->extractValue($properties, ['source']) ?? 'osm',
                        'osm_id' => isset($properties['osm_id']) && is_numeric($properties['osm_id']) ? (int)$properties['osm_id'] : null,
                        'housenumber' => $this->extractValue($properties, ['addr:housenumber']),
                        'unit' => $this->extractValue($properties, ['addr:unit']),
                        'street' => $this->extractValue($properties, ['addr:street']),
                        'suburb' => $this->extractValue($properties, ['addr:suburb']),
                        'city' => $this->extractValue($properties, ['addr:city']),
                        'postcode' => $this->extractValue($properties, ['addr:postcode']),
                        'county' => $this->extractValue($properties, ['addr:county']),
                        'state' => $this->extractValue($properties, ['addr:state']),
                        'country' => $this->extractValue($properties, ['addr:country']),
                        'country_code' => $this->extractValue($properties, ['addr:country_code']),
                        'point_wgs84' => $point,
                    ];

                    if ($action === 'update' && !empty($properties['osm_id'])) {
                        $existingAddress = \App\Models\OsmAddress::where('osm_id', $properties['osm_id'])->first();
                        if ($existingAddress) {
                            $existingAddress->update($addressData);
                            $updatedCount++;
                            continue;
                        }
                    }

                    \App\Models\OsmAddress::create($addressData);
                    $importedCount++;
                } catch (\Exception $e) {
                    Log::error("Error importing OSM Address feature", [
                        'osm_id' => $feature['properties']['osm_id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    $skippedCount++;
                }
            }
        });

        // Clear cache
        Cache::forget('area_data');

        return response()->json([
            'message' => 'OSM Address import completed',
            'imported' => $importedCount,
            'updated' => $updatedCount,
            'skipped' => $skippedCount,
            'total_processed' => $importedCount + $updatedCount + $skippedCount
        ]);
    }
}
