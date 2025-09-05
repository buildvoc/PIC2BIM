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
        return Inertia::render('Nhle/Index', [
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

        // Create cache key based on area IDs
        $sortedAreaIds = $areaIds;
        sort($sortedAreaIds);
        $cacheKey = 'area_data_' . md5(implode(',', $sortedAreaIds));
        
        // Try to get from cache first (30 minutes TTL)
        $cachedData = Cache::get($cacheKey);
        if ($cachedData) {
            return response()->json($cachedData);
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
            ->with('sites')
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

        // Calculate center point of selected areas

        $users = collect();
        User::query()
            ->join('user_role as ur', 'user.id', '=', 'ur.user_id')
            ->select('user.id', 'user.login', 'user.name', 'user.surname', 'user.identification_number', 'user.vat', 'user.email')
            ->where('ur.role_id', '=', User::FARMER_ROLE)
            ->where('user.active', '=', 1)
            ->where('user.pa_id', '=', Auth::user()->pa_id)
            ->with(['photos' => function ($query) use ($builtupAreaGeometriesQuery) {
                $query->select('lat', 'lng', 'path', 'file_name', 'user_id', 'id', 'photo_heading')
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
            'photos' => new DataMapPhotoCollection($photos)
        ];

        // Cache the result for 30 minutes
        Cache::put($cacheKey, $responseData, 1800);

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
