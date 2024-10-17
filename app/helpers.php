<?php

use App\Models\Path;
use App\Models\PathPoint;
use Illuminate\Support\Facades\DB;

function setPath($user_id, $name, $start, $end, $area, $device_manufacture, $device_model, $device_platform, $device_version, $points)
{
    $status = [];
    $path_id = null;
    $points_count = 0;

    $status['status'] = 'ok';
    $status['error_msg'] = null;

    DB::beginTransaction();

    try {
        $path = Path::create([
            'user_id' => $user_id ?: null,
            'name' => $name ?: null,
            'start' => $start ?: null,
            'end' => $end ?: null,
            'area' => $area ?: 0,
            'device_manufacture' => $device_manufacture ?: null,
            'device_model' => $device_model ?: null,
            'device_platform' => $device_platform ?: null,
            'device_version' => $device_version ?: null,
        ]);

        $path_id = $path->id;

        if (is_array($points)) {
            foreach ($points as $point) {
                PathPoint::create([
                    'path_id' => $path_id,
                    'lat' => $point['lat'] ?: null,
                    'lng' => $point['lng'] ?: null,
                    'altitude' => $point['altitude'] ?: null,
                    'accuracy' => $point['accuracy'] ?: null,
                    'created' => $point['created'] ? gmdate('Y-m-d H:i:s', strtotime($point['created'])) : null,
                ]);

                $points_count++;
            }
        }

        DB::commit();

        if ($points_count == 0) {
            $status['status'] = 'error';
            $status['error_msg'] = "no points in the path";
        }

    } catch (\Exception $e) {
        DB::rollBack();
        $status['status'] = 'error';
        $status['error_msg'] = $e->getMessage();
    }

    $status['path_id'] = $path_id;

    return $status;
}

function getShapes($max_lat, $min_lat, $max_lng, $min_lng)
{
    $output = [];

    $max_lat = addslashes($max_lat);
    $min_lat = addslashes($min_lat);
    $max_lng = addslashes($max_lng);
    $min_lng = addslashes($min_lng);

    $results = DB::table('land')
        ->select('identificator', 'wgs_geometry')
        ->where('wgs_min_lat', '<', $max_lat)
        ->where('wgs_max_lat', '>', $min_lat)
        ->where('wgs_min_lng', '<', $max_lng)
        ->where('wgs_max_lng', '>', $min_lng)
        ->get();

    foreach ($results as $rec) {
        $out = [];
        $out['identificator'] = $rec->identificator;
        $out['wgs_geometry'] = $rec->wgs_geometry;
        $output[] = $out;
    }

    return $output;
}