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