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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Carbon\Carbon;

class DataMapController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('DataMap/Index', [
            'shapes' => null,
            'buildings' => null,
            'buildingParts' => null,
            'sites' => null,
            'nhle' => null,
            'center' => null
        ]);
    }

    public function getBuiltupArea(Request $request)
    {
        $BuiltupAreas = BuiltupArea::query()->get();

        return response()->json([
            'shapes' => new BuiltupAreaCollection($BuiltupAreas)
        ]);
    }

    public function getArea(Request $request)
    {
        set_time_limit(300); // 5 minutes
        ini_set('memory_limit', '1024M');

        $areaIds = $request->input('area_ids', []);
        
        if (empty($areaIds)) {
            return response()->json([
                'buildings' => new BuildingCollectionV4(collect()),
                'buildingParts' => new BuildingPartCollectionV2(collect()),
                'sites' => new SiteCollection(collect()),
                'nhle' => collect(),
                'center' => null
            ]);
        }

        // Get the geometries of selected built-up areas
        $builtupAreaGeometriesQuery = BuiltupArea::query()
            ->whereIn('fid', $areaIds)
            ->select('geometry');

        // Fetch buildings within selected areas
        $buildings = collect();
        Building::query()
            ->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select(DB::raw(1))
                    ->fromSub($builtupAreaGeometriesQuery, 's')
                    ->whereRaw('ST_INTERSECTS(bld_fts_building.geometry, s.geometry)');
            })
            ->with('sites', 'buildingAddresses')
            ->chunk(2000, function ($chunk) use (&$buildings) {
                $buildings = $buildings->merge($chunk);
            });

        // Fetch building parts within selected areas
        $buildingParts = collect();
        BuildingPartV2::query()
            ->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select(DB::raw(1))
                    ->fromSub($builtupAreaGeometriesQuery, 's')
                    ->whereRaw('ST_INTERSECTS(bld_fts_buildingpart_v2.geometry, s.geometry)');
            })
            ->with('buildingPartSiteRefs')
            ->chunk(2000, function ($chunk) use (&$buildingParts) {
                $buildingParts = $buildingParts->merge($chunk);
            });

        // Fetch sites within selected areas
        $sites = collect();
        Site::query()
            ->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select(DB::raw(1))
                    ->fromSub($builtupAreaGeometriesQuery, 's')
                    ->whereRaw('ST_INTERSECTS(lus_fts_site.geometry, s.geometry)');
            })
            ->with('buildings', 'buildingPartSiteRefs')
            ->chunk(2000, function ($chunk) use (&$sites) {
                $sites = $sites->merge($chunk);
            });

        // Fetch NHLE data within selected areas
        $nhle = collect();
        NHLE::query()
            ->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select(DB::raw(1))
                    ->fromSub($builtupAreaGeometriesQuery, 's')
                    ->whereRaw('ST_INTERSECTS(nhle_.geom, s.geometry)');
            })
            ->chunk(2000, function ($chunk) use (&$nhle) {
                $nhle = $nhle->merge($chunk);
            });

        // Fetch UPRN points within selected areas
        $uprnFeatures = collect();
        Uprn::query()
            ->whereExists(function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select(DB::raw(1))
                    ->fromSub($builtupAreaGeometriesQuery, 's')
                    ->whereRaw('ST_INTERSECTS(osopenuprn_address.geom, s.geometry)');
            })
            ->select([
                'uprn',
                DB::raw('ST_AsGeoJSON(ST_Transform(osopenuprn_address.geom, 4326)) as geometry')
            ])
            ->chunk(5000, function ($chunk) use (&$uprnFeatures) {
                foreach ($chunk as $row) {
                    if (!empty($row->geometry)) {
                        $uprnFeatures->push([
                            'type' => 'Feature',
                            'geometry' => json_decode($row->geometry, true),
                            'properties' => [
                                'id' => (int)$row->uprn,
                                'uprn' => (int)$row->uprn,
                            ]
                        ]);
                    }
                }
            });

        $uprnGeoJson = [
            'type' => 'FeatureCollection',
            'features' => $uprnFeatures->values()
        ];

        // Calculate center point of selected areas

        $users = collect();
        User::query()
            ->join('user_role as ur', 'user.id', '=', 'ur.user_id')
            ->select('user.id', 'user.login', 'user.name', 'user.surname', 'user.identification_number', 'user.vat', 'user.email')
            ->where('ur.role_id', '=', User::FARMER_ROLE)
            ->where('user.active', '=', 1)
            ->where('user.pa_id', '=', Auth::user()->pa_id)
            ->with(['photos' => function ($query) use ($builtupAreaGeometriesQuery) {
                $query->where('flg_deleted', 0)
                    ->whereExists(function ($subQuery) use ($builtupAreaGeometriesQuery) {
                        $subQuery->select(DB::raw(1))
                            ->fromSub($builtupAreaGeometriesQuery, 's')
                            ->whereRaw('ST_INTERSECTS(ST_Transform(ST_SetSRID(ST_MakePoint(photo.lng, photo.lat), 4326), 27700), s.geometry)');
                    });
            }])
            ->chunk(2000, function ($chunk) use (&$users) {
                $users = $users->merge($chunk);
            });

            $users = $users->filter(function ($user) {
                return $user->photos->isNotEmpty();
            });
    
            // Extract all photos from filtered users for easier access
            $photos = collect();
            foreach ($users as $user) {
                foreach ($user->photos as $photo) {
                    $photo->user_name = $user->name;
                    $photo->link = $photo->link;
                    $photos->push($photo);
                }
            }

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

        $responseData = [
            'buildings' => new BuildingCollectionV4($buildings),
            'buildingParts' => new BuildingPartCollectionV2($buildingParts),
            'sites' => new SiteCollection($sites),
            'nhle' => $nhle,
            'center' => $center,
            'photos' => new DataMapPhotoCollection($photos),
            'uprn' => ['data' => $uprnGeoJson]
        ];

        return response()->json($responseData);
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
            $gid = $feature['properties']['gid'] ?? null;
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
            if (!$osid && $modelClass != NHLE::class ) {
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

            if($modelClass == NHLE::class){
                $existingItemBygid = $modelClass::where('gid', $gid)->first();
                if ($existingItemBygid) {
                    $featureData['status'] = 'duplicate';
                    $featureData['details'] = "Duplicate List Entry: Matches existing item with List Entry '{$gid}'.";
                    $featureData['existing_gid'] = $existingItemBygid->gid;
                    $results[] = $featureData;
                    continue;
                }
            }else if ($modelClass == BuildingPartV2::class){
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
            if($modelClass != NHLE::class){
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
            if($modelClass != NHLE::class){
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

    public function validateUprn(Request $request)
    {
        $results = [];
        $geojson = $request->input('geojson');
        $maxJoinRadiusMeters = (int)($request->input('join_radius_m', 30));
        if ($maxJoinRadiusMeters < 10) { $maxJoinRadiusMeters = 10; }
        if ($maxJoinRadiusMeters > 30) { $maxJoinRadiusMeters = 30; }

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
                if ($nearestSite) { $minDist = is_null($minDist) ? (float)$nearestSite->dist : min($minDist, (float)$nearestSite->dist); }
                if ($nearestBld) { $minDist = is_null($minDist) ? (float)$nearestBld->dist : min($minDist, (float)$nearestBld->dist); }
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
        if ($maxJoinRadiusMeters < 1) { $maxJoinRadiusMeters = 10; }
        if ($maxJoinRadiusMeters > 30) { $maxJoinRadiusMeters = 30; }

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
                                    (float)$attributes['longitude'], (float)$attributes['latitude'],
                                    (float)$attributes['longitude'], (float)$attributes['latitude']
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
                    foreach (['x_coordinate','y_coordinate','latitude','longitude'] as $field) {
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
                $data = $featureAction['data'] ?? null;

                if (!$data || $action === 'skip') {
                    continue;
                }

                if ($action === 'import' || $action === 'update') {
                    $osid = $data['properties']['osid'] ?? null;
                    $gid = $data['properties']['gid'] ?? null;
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
                                'versiondate', 'changetype', 'geometry_area_m2', 'geometry_updatedate',
                                'geometry_capturemethod', 'theme', 'description', 'description_updatedate',
                                'description_capturemethod', 'oslandcovertiera', 'oslandcovertierb',
                                'oslandcover_updatedate', 'oslandcover_capturemethod', 'oslandusetiera',
                                'oslanduse_updatedate', 'oslanduse_capturemethod', 'isobscured',
                                'physicallevel', 'capturespecification', 'containingsitecount', 'lowertierlocalauthority_count'
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

                    if($modelClass == NHLE::class){
                        $instance = $modelClass::updateOrCreate(['gid' => $gid], $attributes);
                    }else{
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

                        $nhle = NHLE::updateOrCreate([
                            'gid' => $properties['gid']
                        ], [
                            'objectid' => $properties['objectid'] ?? null,
                            'name' => $properties['name'] ?? null,
                            'grade' => $properties['grade'] ?? null,
                            'listdate' => isset($properties['listdate']) ? Carbon::parse($properties['listdate'])->toDateString() : null,
                            'amenddate' => isset($properties['amenddate']) ? Carbon::parse($properties['amenddate'])->toDateString() : null,
                            'capturesca' => $properties['capturescale'] ?? null,
                            'hyperlink' => $properties['hyperlink'] ?? null,
                            'ngr' => $properties['ngr'] ?? null,
                            'easting' => $properties['easting'] ?? null,
                            'northing' => $properties['northing'] ?? null,
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
}
