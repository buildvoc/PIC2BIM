<?php

namespace App\Http\Controllers;

use App\Http\Resources\PhotoResource;
use App\Http\Resources\ShapeCollection;
use App\Http\Resources\ShapeFeatureResource;
use App\Models\Attr\Shape;
use App\Models\Photo;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $search = $request->search;
        $ogc_fid = $request->ogc_fid;

        //Cache::forget('shapes');
        $shapes = Cache::rememberForever('shapes', function () {
            return Shape::query()->get();
        });

        $selectedShape = $shapes->first(fn (Shape $item) => $item->ogc_fid == $ogc_fid);

        $photos = Photo::query()
        ->when($selectedShape, function ($query) use ($selectedShape) {
            $geoJson = json_encode($selectedShape->geometry);
            $query->whereRaw("ST_WITHIN(ST_Transform(ST_SetSRID(ST_MakePoint(photo.lng, photo.lat)::geometry, 4326)::geometry, 27700),ST_Transform(ST_SetSRID( ST_AsText(ST_GeomFromGeoJSON('$geoJson')), 4326), 27700))");
        })
        ->paginate(100);

        $photos->appends(array('search' => $search));

        return Inertia::render('Search/Index', [
            'shapes' => new ShapeCollection($shapes),
            'selectedShape' => $selectedShape ? new ShapeFeatureResource($selectedShape): null,
            'photos' => PhotoResource::collection($photos),
            'search' => $search
        ]);
    }

    public function show(Request $request)
    {
        $user = $request->user();

        $shapes = Cache::rememberForever('shapes', function () {
            $data = Shape::query()->get();
            return new ShapeCollection($data);
        });

        // Cache::forget('shapes');

        return Inertia::render('Search/Map', [
            "shapes" => $shapes,
        ]);
    }
}
