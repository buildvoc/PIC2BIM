<?php

namespace App\Http\Controllers;

use App\Http\Resources\ShapeCollection;
use App\Http\Resources\ShapeFeatureResource;
use App\Http\Resources\BuildingCollection;
use App\Models\Attr\Shape;
use App\Models\Attr\Building;
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
    
    public function validation(Request $request)
    {
        $geojson = $request->input('geojson');
        $results = [];

        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['results' => []]);
        }

        foreach ($geojson['features'] as $index => $feature) {
            if (!isset($feature['geometry']) || !isset($feature['properties'])) {
                continue;
            }

            $warnings = [];
            $osid = $feature['properties']['osid'] ?? 'N/A';
            $geometry = json_encode($feature['geometry']);
            $srid = $geojson['crs']['properties']['name'] ?? 'EPSG:4326';
            $sridNumber = (int) filter_var($srid, FILTER_SANITIZE_NUMBER_INT);

            // 1. OSID Check
            if ($osid !== 'N/A') {
                $existing = Building::where('osid', $osid)->first();
                if ($existing) {
                    $warnings[] = "Duplicate OSID: A building with OSID '{$osid}' already exists.";
                }
            }

            // 2. Exact Geometry Check
            $exactMatch = Building::whereRaw("ST_Equals(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700))", [$geometry, $sridNumber])->first();
            if ($exactMatch) {
                $warnings[] = "Exact Geometry Match: Matches existing building (OSID: {$exactMatch->osid}).";
            }

            // 3. Spatial Overlap Check
            $spatialOverlap = Building::whereRaw("ST_Intersects(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700))", [$geometry, $sridNumber])
                ->whereRaw("NOT ST_Equals(geometry, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), ?), 27700))", [$geometry, $sridNumber])
                ->first();

            if ($spatialOverlap) {
                $warnings[] = "Spatial Overlap: Overlaps with existing building (OSID: {$spatialOverlap->osid}).";
            }

            $featureData = [
                'feature_index' => $index + 1,
                'properties' => $feature['properties'],
                'status' => empty($warnings) ? 'ok' : 'warning',
                'details' => empty($warnings) ? 'Ready to import.' : implode('; ', $warnings)
            ];
            
            $results[] = $featureData;
        }

        return response()->json(['results' => $results]);
    }

    public function import(Request $request)
    {
        $geojson = $request->input('geojson');

        if (!$geojson || !isset($geojson['features'])) {
            return response()->json(['error' => 'Invalid GeoJSON file.'], 400);
        }

        $validationResults = $this->runValidation($geojson);
        foreach ($validationResults as $result) {
            if ($result['status'] !== 'ok') {
                return response()->json(['error' => 'Import failed. All features must be valid before importing.'], 422);
            }
        }

        $count = 0;
        DB::beginTransaction();
        try {
            foreach ($geojson['features'] as $data) {
                $srid = $geojson['crs']['properties']['name'] ?? 'EPSG:4326';
                $sridNumber = (int) filter_var($srid, FILTER_SANITIZE_NUMBER_INT);

                Building::updateOrCreate([
                    'osid' => $data['properties']['osid']
                ], [
                    'versiondate' => $data['properties']['versiondate'] ?? null,
                    'versionavailablefromdate' => $data['properties']['versionavailablefromdate'] ?? null,
                    'versionavailabletodate' => $data['properties']['versionavailabletodate'] ?? null,
                    'changetype' => $data['properties']['changetype'] ?? null,
                    'geometry' => isset($data['geometry']) ? DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('" . json_encode($data['geometry']) . "'), $sridNumber), 27700)") : null,
                    'geometry_area_m2' => $data['properties']['geometry_area_m2'] ?? null,
                    'geometry_updatedate' => $data['properties']['geometry_updatedate'] ?? null,
                    'theme' => $data['properties']['theme'] ?? null,
                    'description' => $data['properties']['description'] ?? null,
                    'description_updatedate' => $data['properties']['description_updatedate'] ?? null,
                    'physicalstate' => $data['properties']['physicalstate'] ?? '',
                    'physicalstate_updatedate' => date('Y-m-d'),
                    'buildingpartcount' => $data['properties']['buildingpartcount'] ?? null,
                    'isinsite' => $data['properties']['isinsite'] ?? null,
                    'primarysiteid' => $data['properties']['primarysiteid'] ?? null,
                    'containingsitecount' => $data['properties']['containingsitecount'] ?? null,
                    'mainbuildingid' => $data['properties']['mainbuildingid'] ?? null,
                    'mainbuildingid_ismainbuilding' => $data['properties']['mainbuildingid_ismainbuilding'] ?? null,
                    'mainbuildingid_updatedate' => $data['properties']['mainbuildingid_updatedate'] ?? null,
                    'buildinguse' => $data['properties']['buildinguse'] ?? null,
                    'buildinguse_oslandusetiera' => $data['properties']['buildinguse_oslandusetiera'] ?? null,
                    'buildinguse_addresscount_total' => $data['properties']['buildinguse_addresscount_total'] ?? null,
                    'buildinguse_addresscount_residential' => $data['properties']['buildinguse_addresscount_residential'] ?? null,
                    'buildinguse_addresscount_commercial' => $data['properties']['buildinguse_addresscount_commercial'] ?? null,
                    'buildinguse_addresscount_other' => $data['properties']['buildinguse_addresscount_other'] ?? null,
                    'buildinguse_updatedate' => $data['properties']['buildinguse_updatedate'] ?? null,
                    'connectivity' => $data['properties']['connectivity'] ?? null,
                    'connectivity_count' => $data['properties']['connectivity_count'] ?? null,
                    'connectivity_updatedate' => $data['properties']['connectivity_updatedate'] ?? null,
                    'constructionmaterial' => $data['properties']['constructionmaterial'] ?? null,
                    'constructionmaterial_evidencedate' => $data['properties']['constructionmaterial_evidencedate'] ?? null,
                    'constructionmaterial_updatedate' => $data['properties']['constructionmaterial_updatedate'] ?? null,
                    'constructionmaterial_source' => $data['properties']['constructionmaterial_source'] ?? null,
                    'constructionmaterial_capturemethod' => $data['properties']['constructionmaterial_capturemethod'] ?? null,
                    'constructionmaterial_thirdpartyprovenance' => $data['properties']['constructionmaterial_thirdpartyprovenance'] ?? null,
                    'buildingage_period' => $data['properties']['buildingage_period'] ?? null,
                    'buildingage_year' => $data['properties']['buildingage_year'] ?? null,
                    'buildingage_evidencedate' => $data['properties']['buildingage_evidencedate'] ?? null,
                    'buildingage_updatedate' => $data['properties']['buildingage_updatedate'] ?? null,
                    'buildingage_source' => $data['properties']['buildingage_source'] ?? null,
                    'buildingage_capturemethod' => $data['properties']['buildingage_capturemethod'] ?? null,
                    'buildingage_thirdpartyprovenance' => $data['properties']['buildingage_thirdpartyprovenance'] ?? null,
                    'basementpresence' => $data['properties']['basementpresence'] ?? null,
                    'basementpresence_selfcontained' => $data['properties']['basementpresence_selfcontained'] ?? null,
                    'basementpresence_evidencedate' => $data['properties']['basementpresence_evidencedate'] ?? null,
                    'basementpresence_updatedate' => $data['properties']['basementpresence_updatedate'] ?? null,
                    'basementpresence_source' => $data['properties']['basementpresence_source'] ?? null,
                    'basementpresence_capturemethod' => $data['properties']['basementpresence_capturemethod'] ?? null,
                    'basementpresence_thirdpartyprovenance' => $data['properties']['basementpresence_thirdpartyprovenance'] ?? null,
                    'numberoffloors' => $data['properties']['numberoffloors'] ?? null,
                    'numberoffloors_evidencedate' => $data['properties']['numberoffloors_evidencedate'] ?? null,
                    'numberoffloors_updatedate' => $data['properties']['numberoffloors_updatedate'] ?? null,
                    'numberoffloors_source' => $data['properties']['numberoffloors_source'] ?? null,
                    'numberoffloors_capturemethod' => $data['properties']['numberoffloors_capturemethod'] ?? null,
                    'height_absolutemin_m' => $data['properties']['height_absolutemin_m'] ?? null,
                    'height_absoluteroofbase_m' => $data['properties']['height_absoluteroofbase_m'] ?? null,
                    'height_absolutemax_m' => $data['properties']['height_absolutemax_m'] ?? null,
                    'height_relativeroofbase_m' => $data['properties']['height_relativeroofbase_m'] ?? null,
                    'height_relativemax_m' => $data['properties']['height_relativemax_m'] ?? null,
                    'height_confidencelevel' => $data['properties']['height_confidencelevel'] ?? null,
                    'height_evidencedate' => $data['properties']['height_evidencedate'] ?? null,
                    'height_updatedate' => $data['properties']['height_updatedate'] ?? null,
                    'roofmaterial_primarymaterial' => $data['properties']['roofmaterial_primarymaterial'] ?? null,
                    'roofmaterial_solarpanelpresence' => $data['properties']['roofmaterial_solarpanelpresence'] ?? null,
                    'roofmaterial_greenroofpresence' => $data['properties']['roofmaterial_greenroofpresence'] ?? null,
                    'roofmaterial_confidenceindicator' => $data['properties']['roofmaterial_confidenceindicator'] ?? null,
                    'roofmaterial_evidencedate' => $data['properties']['roofmaterial_evidencedate'] ?? null,
                    'roofmaterial_updatedate' => $data['properties']['roofmaterial_updatedate'] ?? null,
                    'roofmaterial_capturemethod' => $data['properties']['roofmaterial_capturemethod'] ?? null,
                    'roofshapeaspect_shape' => $data['properties']['roofshapeaspect_shape'] ?? null,
                    'roofshapeaspect_areapitched_m2' => $data['properties']['roofshapeaspect_areapitched_m2'] ?? null,
                    'roofshapeaspect_areaflat_m2' => $data['properties']['roofshapeaspect_areaflat_m2'] ?? null,
                    'roofshapeaspect_areafacingnorth_m2' => $data['properties']['roofshapeaspect_areafacingnorth_m2'] ?? null,
                    'roofshapeaspect_areafacingnortheast_m2' => $data['properties']['roofshapeaspect_areafacingnortheast_m2'] ?? null,
                    'roofshapeaspect_areafacingeast_m2' => $data['properties']['roofshapeaspect_areafacingeast_m2'] ?? null,
                    'roofshapeaspect_areafacingsoutheast_m2' => $data['properties']['roofshapeaspect_areafacingsoutheast_m2'] ?? null,
                    'roofshapeaspect_areafacingsouth_m2' => $data['properties']['roofshapeaspect_areafacingsouth_m2'] ?? null,
                    'roofshapeaspect_areafacingsouthwest_m2' => $data['properties']['roofshapeaspect_areafacingsouthwest_m2'] ?? null,
                    'roofshapeaspect_areafacingwest_m2' => $data['properties']['roofshapeaspect_areafacingwest_m2'] ?? null,
                    'roofshapeaspect_areafacingnorthwest_m2' => $data['properties']['roofshapeaspect_areafacingnorthwest_m2'] ?? null,
                    'roofshapeaspect_areaindeterminable_m2' => $data['properties']['roofshapeaspect_areaindeterminable_m2'] ?? null,
                    'roofshapeaspect_areatotal_m2' => $data['properties']['roofshapeaspect_areatotal_m2'] ?? null,
                    'roofshapeaspect_confidenceindicator' => $data['properties']['roofshapeaspect_confidenceindicator'] ?? null,
                    'roofshapeaspect_evidencedate' => $data['properties']['roofshapeaspect_evidencedate'] ?? null,
                    'roofshapeaspect_updatedate' => $data['properties']['roofshapeaspect_updatedate'] ?? null,
                    'roofshapeaspect_capturemethod' => $data['properties']['roofshapeaspect_capturemethod'] ?? null,
                ]);
                $count++;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during import: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => "Import successful. {$count} buildings imported."]);
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
