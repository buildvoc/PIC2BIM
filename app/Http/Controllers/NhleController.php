<?php

namespace App\Http\Controllers;

use App\Http\Resources\NhleCollection;
use App\Http\Resources\NhleFeatureResource;
use App\Http\Resources\ShapeCollection;
use App\Http\Resources\ShapeFeatureResource;
use App\Models\Attr\Shape;
use App\Models\NHLE;
use Inertia\Inertia;
use Illuminate\Http\Request;

class NhleController extends Controller
{
    public function index(Request $request)
    {
        $ogc_fid = $request->ogc_fid;

        $shapes = Shape::query()->get();

        $selectedShape = $shapes->first(fn (Shape $item) => $item->ogc_fid == $ogc_fid);

        $nhle = [];
        
        if ($ogc_fid){
            $nhle = NHLE::query()
            ->when($selectedShape, function ($query) use ($selectedShape) {
                $geoJson = json_encode($selectedShape->geometry);
                $query->whereRaw("ST_WITHIN(ST_Transform(ST_SetSRID(ST_MakePoint(nhle_.longitude, nhle_.latitude)::geometry, 4326)::geometry, 27700),ST_Transform(ST_SetSRID( ST_AsText(ST_GeomFromGeoJSON('$geoJson')), 4326), 27700))");
            })
            ->get();
        }

        return Inertia::render('Nhle/Index', [
            'shapes' => new ShapeCollection($shapes),
            'selectedShape' => $selectedShape ? new ShapeFeatureResource($selectedShape): null,
            'nhles' => new NhleCollection($nhle),
            'ogc_fid' => $ogc_fid
        ]);
    }

    public function nhleViewer()
    {
        return Inertia::render('Nhle/NhleLoader');
    }
}
