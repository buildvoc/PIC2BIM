<?php

namespace App\Http\Controllers;

use App\Models\Path;
use App\Models\Photo;
use Illuminate\Http\Request;
use PDO;

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
}
