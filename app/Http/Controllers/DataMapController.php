<?php

namespace App\Http\Controllers;

use App\Http\Resources\ShapeCollection;
use App\Http\Resources\ShapeFeatureResource;
use App\Http\Resources\BuildingCollection;
use App\Models\Attr\Shape;
use App\Models\Attr\Building;
use App\Models\Attr\Site;
use App\Models\Attr\SiteAddressReference;
use App\Models\Attr\BuildingAddress;
use App\Models\Attr\BuildingPartLink;
use App\Models\Attr\BuildingSiteLink;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DataMapController extends Controller
{
    public function index(Request $request)
    {
        $shapes = Shape::query()
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('bld_fts_building')
                    ->whereRaw("ST_INTERSECTS(shape.wkb_geometry, ST_Transform(bld_fts_building.geometry, 27700))");
            })
            ->get();

        $nhle = Building::query()
            ->where(function ($query) use ($shapes) {
                foreach ($shapes as $shape) {
                    $geoJson = json_encode($shape->geometry);
                    $query->orWhereRaw("ST_INTERSECTS(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 27700))", [$geoJson]);
                }
            })
            ->get();

        $center = null;
        if ($shapes->isNotEmpty()) {
            $centerData = DB::table('shape')
                ->select(DB::raw('ST_AsGeoJSON(ST_Transform(ST_Centroid(ST_Collect(wkb_geometry)), 4326)) as center'))
                ->whereIn('ogc_fid', $shapes->pluck('ogc_fid'))
                ->first();

            if ($centerData && $centerData->center) {
                $center = json_decode($centerData->center);
            }
        }

        return Inertia::render('Nhle/Index', [
            'shapes' => new ShapeCollection($shapes),
            'selectedShape' => null,
            'nhles' => new BuildingCollection($nhle),
            'center' => $center,
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
            if (!$osid) {
                $featureData['status'] = 'missing_osid';
                $featureData['details'] = 'Missing OSID. Import will be skipped.';
                $results[] = $featureData;
                continue;
            }

            $existingItemByOsid = $modelClass::where('osid', $osid)->first();
            if ($existingItemByOsid) {
                $featureData['status'] = 'duplicate';
                $featureData['details'] = "Duplicate OSID: Matches existing item with OSID '{$osid}'.";
                $featureData['existing_osid'] = $existingItemByOsid->osid;
                $results[] = $featureData;
                continue;
            }

            // 2. Exact Geometry Check
            $geomSql = "ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700)";
            $exactMatch = $modelClass::whereRaw("ST_Equals(geometry, {$geomSql})", [$geometry, $sridNumber])->first();
            if ($exactMatch) {
                $featureData['status'] = 'exact_match';
                $featureData['details'] = "Exact Geometry: Matches existing item (OSID: {$exactMatch->osid}).";
                $results[] = $featureData;
                continue;
            }

            // 3. Spatial Overlap Check with Tolerance
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

    private function performImport($modelClass, Request $request)
    {
        $features = $request->input('features');
        $sridNumber = $request->input('srid', 4326);

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
                    if (!$osid) continue; // Cannot import/update without an OSID

                    $isUpdate = ($action === 'update');

                    $model = new $modelClass;
                    $fillable = $model->getFillable();
                    $attributes = [];

                    foreach ($fillable as $field) {
                        if (in_array($field, ['osid', 'geometry'])) {
                            continue;
                        }

                        $value = $data['properties'][$field] ?? null;

                        if ($field === 'oslandusetierb' && is_array($value)) {
                            $attributes[$field] = json_encode($value);
                        } else {
                            $attributes[$field] = $value;
                        }
                    }

                    if (isset($data['geometry'])) {
                        $attributes['geometry'] = DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('" . json_encode($data['geometry']) . "'), {$sridNumber}), 27700)");
                    }

                    $instance = $modelClass::updateOrCreate(['osid' => $osid], $attributes);

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

        $modelName = class_basename($modelClass);
        return response()->json(['message' => "Import successful. {$importedCount} new {$modelName}s imported, {$updatedCount} {$modelName}s updated."]);
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
    
    public function index2(Request $request)
    {
        $ogc_fid = $request->ogc_fid;

        $shapes = Shape::query()
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('bld_fts_building')
                    ->whereRaw("ST_INTERSECTS(shape.wkb_geometry, ST_Transform(bld_fts_building.geometry, 27700))");
            })
            ->get();
        $selectedShape = $shapes->first(fn (Shape $item) => $item->ogc_fid == $ogc_fid);

        $nhle = [];
        
        if ($ogc_fid){
            $nhle = Building::query()
            ->when($selectedShape, function ($query) use ($selectedShape) {
                $geoJson = json_encode($selectedShape->geometry);
                $query->whereRaw("ST_INTERSECTS(geometry::geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('$geoJson')::geometry, 4326)::geometry, 27700))");
            })
            ->get();
        }

        return Inertia::render('Nhle/Index2', [
            'shapes' => new ShapeCollection($shapes),
            'selectedShape' => $selectedShape ? new ShapeFeatureResource($selectedShape): null,
            'nhles' => new BuildingCollection($nhle),
            'ogc_fid' => $ogc_fid
        ]);
    }
}
