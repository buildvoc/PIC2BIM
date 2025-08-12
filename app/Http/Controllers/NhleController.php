<?php

namespace App\Http\Controllers;

use App\Http\Resources\NhleCollection;
use App\Http\Resources\NhleFeatureResource;
use App\Http\Resources\ShapeCollection;
use App\Http\Resources\ShapeFeatureResource;
use App\Http\Resources\BuildingCollection;
use App\Models\Attr\Shape;
use App\Models\Attr\Building;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NhleController extends Controller
{
    public function index(Request $request)
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

        return Inertia::render('Nhle/Index', [
            'shapes' => new ShapeCollection($shapes),
            'selectedShape' => $selectedShape ? new ShapeFeatureResource($selectedShape): null,
            'nhles' => new BuildingCollection($nhle),
            'ogc_fid' => $ogc_fid
        ]);
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
