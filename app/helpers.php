<?php

use App\Models\Path;
use App\Models\PathPoint;
use App\Models\Photo;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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

function getTaskStatus($task_id)
{
    $status = '';

    $task = DB::table('task')->select('status')->where('id', $task_id)->first();

    if ($task) {
        $status = $task->status;
    }

    return $status;
}

function setPhoto($photo, $user_id, $task_id)
{
    $status = [];
    $status['status'] = 'ok';
    $status['error_msg'] = null;

    try {

        DB::beginTransaction();

        $existingPhoto = Photo::where('digest', $photo['digest'])->first();

        if (!$existingPhoto) {
            $newPhoto = Photo::create([
                'task_id' => $task_id ?: null,
                'user_id' => $user_id,
                'note' => $photo['note'] ?? null,
                'lat' => $photo['lat'] ?? null,
                'lng' => $photo['lng'] ?? null,
                'centroidLat' => $photo['centroidLat'] ?? null,
                'centroidLng' => $photo['centroidLng'] ?? null,
                'altitude' => $photo['altitude'] ?? null,
                'bearing' => $photo['bearing'] ?? null,
                'magnetic_azimuth' => $photo['magnetic_azimuth'] ?? null,
                'photo_heading' => $photo['photo_heading'] ?? null,
                'pitch' => $photo['pitch'] ?? null,
                'roll' => $photo['roll'] ?? null,
                'photo_angle' => $photo['photo_angle'] ?? null,
                'orientation' => $photo['orientation'] ?? null,
                'horizontal_view_angle' => $photo['horizontalViewAngle'] ?? null,
                'vertical_view_angle' => $photo['verticalViewAngle'] ?? null,
                'accuracy' => $photo['accuracy'] ?? null,
                'created' => isset($photo['created']) ? gmdate('Y-m-d H:i:s', strtotime($photo['created'])) : null,
                'device_manufacture' => $photo['deviceManufacture'] ?? null,
                'device_model' => $photo['deviceModel'] ?? null,
                'device_platform' => $photo['devicePlatform'] ?? null,
                'device_version' => $photo['deviceVersion'] ?? null,
                'sats_info' => isset($photo['satsInfo']) ? json_encode($photo['satsInfo']) : null,
                'extra_sat_count' => $photo['extraSatCount'] ?? null,
                'nmea_msg' => $photo['NMEAMessage'] ?? null,
                'network_info' => isset($photo['networkInfo']) ? json_encode($photo['networkInfo']) : null,
                'nmea_location' => null,
                'nmea_distance' => null,
                'digest' => $photo['digest'],
                'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
            ]);

            $status['photo_id'] = $newPhoto->id;

            if (@$photo['devicePlatform'] == 'Android') {
                $nmea_location = get_coordinates_from_nmea($photo['NMEAMessage']);
                if ($nmea_location) {
                    $newPhoto->nmea_location = json_encode($nmea_location);
                    $newPhoto->nmea_distance = get_distance_from_coordinates($photo['lat'], $photo['lng'], $nmea_location['lat'], $nmea_location['lon']);
                    $newPhoto->save();
                }
            }

            if (isset($photo['photo'])) {
                $user = User::find($user_id);
                $pa_id = $user->pa_id;

                $data = base64_decode(str_replace(' ', '+', $photo['photo']));
                $image_name = 'image_' . $newPhoto->id . '.jpeg';
                $path = 'photos4all/' . $pa_id . '/' . $user_id . '/';

                Storage::disk('local')->makeDirectory($path);
                Storage::disk('local')->put($path . $image_name, $data);

                $hash = hash('sha256', 'bfb576892e43b763731a1596c428987893b2e76ce1be10f733_' . hash('sha256', $data) . '_' . $photo['created'] . '_' . $user_id);
                $flg_original = $hash === $photo['digest'] ? 1 : 0;

                $newPhoto->update([
                    'path' => $path,
                    'file_name' => $image_name,
                    'flg_original' => $flg_original,
                ]);
            }
        }

        DB::commit();
    } catch (\Exception $e) {
        DB::rollBack();
        $status['status'] = 'error';
        $status['error_msg'] = $e->getMessage();
        unset($status['photo_id']);
    }

    return $status;
}

function getPhoto($photo_id)
{
    $photo = DB::table('photo')
        ->select([
            'altitude',
            'vertical_view_angle',
            'distance',
            'nmea_distance',
            'accuracy',
            'device_manufacture',
            'device_model',
            'device_platform',
            'device_version',
            'efkLatGpsL1',
            'efkLngGpsL1',
            'efkAltGpsL1',
            'efkTimeGpsL1',
            'efkLatGpsL5',
            'efkLngGpsL5',
            'efkAltGpsL5',
            'efkTimeGpsL5',
            'efkLatGpsIf',
            'efkLngGpsIf',
            'efkAltGpsIf',
            'efkTimeGpsIf',
            'efkLatGalE1',
            'efkLngGalE1',
            'efkAltGalE1',
            'efkTimeGalE1',
            'efkLatGalE5',
            'efkLngGalE5',
            'efkAltGalE5',
            'efkTimeGalE5',
            'efkLatGalIf',
            'efkLngGalIf',
            'efkAltGalIf',
            'efkTimeGalIf',
            'note',
            'lat',
            'lng',
            'photo_heading',
            'created',
            'path',
            'file_name',
            'digest'
        ])
        ->where('flg_deleted', 0)
        ->where('id', $photo_id)
        ->first();

    $output = [];

    if ($photo) {
        $output = [
            'altitude' => $photo->altitude,
            'vertical_view_angle' => $photo->vertical_view_angle,
            'accuracy' => $photo->accuracy,
            'distance' => $photo->distance,
            'nmea_distance' => $photo->nmea_distance,
            'device_manufacture' => $photo->device_manufacture,
            'device_model' => $photo->device_model,
            'device_platform' => $photo->device_platform,
            'device_version' => $photo->device_version,
            'efkLatGpsL1' => $photo->efkLatGpsL1,
            'efkLngGpsL1' => $photo->efkLngGpsL1,
            'efkAltGpsL1' => $photo->efkAltGpsL1,
            'efkTimeGpsL1' => $photo->efkTimeGpsL1,
            'efkLatGpsL5' => $photo->efkLatGpsL5,
            'efkLngGpsL5' => $photo->efkLngGpsL5,
            'efkAltGpsL5' => $photo->efkAltGpsL5,
            'efkTimeGpsL5' => $photo->efkTimeGpsL5,
            'efkLatGpsIf' => $photo->efkLatGpsIf,
            'efkLngGpsIf' => $photo->efkLngGpsIf,
            'efkAltGpsIf' => $photo->efkAltGpsIf,
            'efkTimeGpsIf' => $photo->efkTimeGpsIf,
            'efkLatGalE1' => $photo->efkLatGalE1,
            'efkLngGalE1' => $photo->efkLngGalE1,
            'efkAltGalE1' => $photo->efkAltGalE1,
            'efkTimeGalE1' => $photo->efkTimeGalE1,
            'efkLatGalE5' => $photo->efkLatGalE5,
            'efkLngGalE5' => $photo->efkLngGalE5,
            'efkAltGalE5' => $photo->efkAltGalE5,
            'efkTimeGalE5' => $photo->efkTimeGalE5,
            'efkLatGalIf' => $photo->efkLatGalIf,
            'efkLngGalIf' => $photo->efkLngGalIf,
            'efkAltGalIf' => $photo->efkAltGalIf,
            'efkTimeGalIf' => $photo->efkTimeGalIf,
            'note' => $photo->note,
            'lat' => $photo->lat,
            'lng' => $photo->lng,
            'photo_heading' => $photo->photo_heading,
            'created' => $photo->created,
            'digest' => $photo->digest,
        ];

        $file = null;
        $filePath = storage_path('app/private/' . $photo->path . $photo->file_name);

        if (file_exists($filePath)) {
            $file = file_get_contents($filePath);
        }

        $output['photo'] = $file ? base64_encode($file) : null;
    }

    return $output;
}

function get_coordinates_from_nmea($nmea_msg)
{
    $record = '';
    $p1 = strrpos($nmea_msg, 'RMC');
    if ($p1 !== false) {
        $p2 = strpos($nmea_msg, '*', $p1);
        $record = substr($nmea_msg, $p1 - 3, $p2 - $p1 + 6);

        $record_array = explode(',', $record);
        $nmea_location = array();

        if ($record_array[3] && $record_array[5]) {
            $nmea_location['lat'] = substr($record_array[3], 0, 2) + substr($record_array[3], 2) / 60;
            if ($record_array[4] == 'S') $record_array[3] = -$record_array[3];
            $nmea_location['lon'] = substr($record_array[5], 0, 3) + substr($record_array[5], 3) / 60;
            if ($record_array[6] == 'W') $record_array[5] = -$record_array[5];

            return $nmea_location;
        }
    }

    return false;
}
function get_distance_from_coordinates($a_lat, $a_lng, $b_lat, $b_lng)
{

    $const_p = pi() / 180;
    $const_r = 12742;

    $a = 0.5 - cos(($b_lat - $a_lat) * $const_p) / 2 + cos($a_lat * $const_p) * cos($b_lat * $const_p) * (1 - cos(($b_lng - $a_lng) * $const_p)) / 2;

    $distance = $const_r * sin(sqrt($a));

    return $distance * 1000;
}


function setPhotos($photos, $user_id, $task_id)
{
    $status = [
        'status' => 'ok',
        'error_msg' => null,
    ];

    DB::beginTransaction();

    try {
        if (is_array($photos)) {
            foreach ($photos as $photo) {

                $note = isset($photo['note']) ? $photo['note'] : null;
                $lat = isset($photo['lat']) ? $photo['lat'] : null;
                $lng = isset($photo['lng']) ? $photo['lng'] : null;
                $centroidLat = isset($photo['centroidLat']) ? $photo['centroidLat'] : null;
                $centroidLng = isset($photo['centroidLng']) ? $photo['centroidLng'] : null;
                $altitude = isset($photo['altitude']) ? $photo['altitude'] : null;
                $bearing = isset($photo['bearing']) ? $photo['bearing'] : null;
                $magnetic_azimuth = isset($photo['magnetic_azimuth']) ? $photo['magnetic_azimuth'] : null;
                $photo_heading = isset($photo['photo_heading']) ? $photo['photo_heading'] : null;
                $pitch = isset($photo['pitch']) ? $photo['pitch'] : null;
                $roll = isset($photo['roll']) ? $photo['roll'] : null;
                $photo_angle = isset($photo['photo_angle']) ? $photo['photo_angle'] : null;
                $orientation = isset($photo['orientation']) ? $photo['orientation'] : null;
                $horizontal_view_angle = isset($photo['horizontalViewAngle']) ? $photo['horizontalViewAngle'] : null;
                $vertical_view_angle = isset($photo['verticalViewAngle']) ? $photo['verticalViewAngle'] : null;
                $accuracy = isset($photo['accuracy']) ? $photo['accuracy'] : null;
                $device_manufacture = isset($photo['deviceManufacture']) ? $photo['deviceManufacture'] : null;
                $device_model = isset($photo['deviceModel']) ? $photo['deviceModel'] : null;
                $device_platform = isset($photo['devicePlatform']) ? $photo['devicePlatform'] : null;
                $device_version = isset($photo['deviceVersion']) ? $photo['deviceVersion'] : null;
                $sats_info = isset($photo['satsInfo']) ? json_encode($photo['satsInfo']) : null;
                $extra_sat_count = isset($photo['extraSatCount']) ? $photo['extraSatCount'] : null;
                $nmea_msg = isset($photo['NMEAMessage']) ? $photo['NMEAMessage'] : null;
                $network_info = isset($photo['networkInfo']) ? json_encode($photo['networkInfo']) : null;
                $created = isset($photo['created']) ? gmdate('Y-m-d H:i:s', strtotime($photo['created'])) : null;
                $digest = isset($photo['digest']) ? $photo['digest'] : null;

                $nmea_location_json = null;
                $nmea_distance = null;
                if ($device_platform === 'Android' && $nmea_msg) {
                    $nmea_location = get_coordinates_from_nmea($nmea_msg);
                    if ($nmea_location) {
                        $nmea_location_json = json_encode($nmea_location);
                        $nmea_distance = get_distance_from_coordinates($photo['lat'], $photo['lng'], $nmea_location['lat'], $nmea_location['lon']);
                    }
                }

                $efkLatGpsL1 = $photo['efkLatGpsL1'] ?? null;
                $efkLngGpsL1 = $photo['efkLngGpsL1'] ?? null;
                $efkAltGpsL1 = $photo['efkAltGpsL1'] ?? null;
                $efkTimeGpsL1 = isset($photo['efkTimeGpsL1']) ? gmdate('Y-m-d H:i:s', strtotime($photo['efkTimeGpsL1'])) : null;
                $efkLatGpsL5 = $photo['efkLatGpsL5'] ?? null;
                $efkLngGpsL5 = $photo['efkLngGpsL5'] ?? null;
                $efkAltGpsL5 = $photo['efkAltGpsL5'] ?? null;
                $efkTimeGpsL5 = isset($photo['efkTimeGpsL5']) ? gmdate('Y-m-d H:i:s', strtotime($photo['efkTimeGpsL5'])) : null;
                $efkLatGpsIf = $photo['efkLatGpsIf'] ?? null;
                $efkLngGpsIf = $photo['efkLngGpsIf'] ?? null;
                $efkAltGpsIf = $photo['efkAltGpsIf'] ?? null;
                $efkTimeGpsIf = isset($photo['efkTimeGpsIf']) ? gmdate('Y-m-d H:i:s', strtotime($photo['efkTimeGpsIf'])) : null;

                $existing_photo = DB::table('photo')->where('digest', $digest)->first();

                if (!$existing_photo) {
                    $photo_id = DB::table('photo')->insertGetId([
                        'task_id' => $task_id,
                        'user_id' => $user_id,
                        'note' => $note,
                        'lat' => $lat,
                        'lng' => $lng,
                        'centroidLat' => $centroidLat,
                        'centroidLng' => $centroidLng,
                        'altitude' => $altitude,
                        'bearing' => $bearing,
                        'magnetic_azimuth' => $magnetic_azimuth,
                        'photo_heading' => $photo_heading,
                        'pitch' => $pitch,
                        'roll' => $roll,
                        'photo_angle' => $photo_angle,
                        'orientation' => $orientation,
                        'horizontal_view_angle' => $horizontal_view_angle,
                        'vertical_view_angle' => $vertical_view_angle,
                        'accuracy' => $accuracy,
                        'created' => $created,
                        'device_manufacture' => $device_manufacture,
                        'device_model' => $device_model,
                        'device_platform' => $device_platform,
                        'device_version' => $device_version,
                        'sats_info' => $sats_info,
                        'extra_sat_count' => $extra_sat_count,
                        'nmea_msg' => $nmea_msg,
                        'network_info' => $network_info,
                        'timestamp' => now(),
                        'digest' => $digest,
                        'nmea_location' => $nmea_location_json,
                        'nmea_distance' => $nmea_distance,
                        'efkLatGpsL1' => $efkLatGpsL1,
                        'efkLngGpsL1' => $efkLngGpsL1,
                        'efkAltGpsL1' => $efkAltGpsL1,
                        'efkTimeGpsL1' => $efkTimeGpsL1,
                        'efkLatGpsL5' => $efkLatGpsL5,
                        'efkLngGpsL5' => $efkLngGpsL5,
                        'efkAltGpsL5' => $efkAltGpsL5,
                        'efkTimeGpsL5' => $efkTimeGpsL5,
                        'efkLatGpsIf' => $efkLatGpsIf,
                        'efkLngGpsIf' => $efkLngGpsIf,
                        'efkAltGpsIf' => $efkAltGpsIf,
                        'efkTimeGpsIf' => $efkTimeGpsIf,
                    ]);
                    if (isset($photo['photo'])) {
                        $sql_path = DB::table('user')->select('pa_id')->where('id', $user_id)->first();
                        $pa_id = $sql_path->pa_id;

                        $data = base64_decode($photo['photo']);
                        $image_name = 'image_' . $photo_id . '.jpeg';
                        $path = 'photos4all/' . $pa_id . '/' . $user_id . '/';

                        if (!Storage::exists($path)) {
                            Storage::makeDirectory($path);
                        }

                        Storage::put($path . $image_name, $data);

                        $hash = hash('sha256', 'bfb576892e43b763731a1596c428987893b2e76ce1be10f733_' . hash('sha256', $data) . '_' . $photo['created'] . '_' . $user_id);
                        $flg_original = ($hash == $photo['digest']) ? 1 : 0;

                        DB::table('photo')->where('id', $photo_id)->update([
                            'path' => $path,
                            'file_name' => $image_name,
                            'timestamp' => now(),
                            'flg_original' => $flg_original
                        ]);
                    }
                }
            }
        }

        DB::commit();
    } catch (\Exception $e) {

        DB::rollBack();
        $status['status'] = 'error';
        $status['error_msg'] = $e->getMessage();
    }

    return $status;
}

function setTaskStatus($task_id, $status, $note)
{
    $output = [];
    $note = $note ? $note : null;
    try {
        DB::table('task')
            ->where('id', $task_id)
            ->update([
                'status' => $status,
                'note' => $note,
                'timestamp' => now()
            ]);

        $output['status'] = 'ok';
        $output['error_msg'] = null;
    } catch (\Exception $e) {
        $output['status'] = 'error';
        $output['error_msg'] = $e->getMessage();
    }

    return $output;
}
function checkTaskPhotos($task_id)
{
    $photoCount = DB::table('photo')
        ->where('task_id', $task_id)
        ->count();

    return $photoCount > 0;
}

function getTaskPhotos($task_id = null, $user_id = null)
{
    $output = [];

    // Build the query based on the conditions
    $query = DB::table('photo')
        ->select([
            'altitude',
            'vertical_view_angle',
            'accuracy',
            'distance',
            'nmea_distance',
            'device_manufacture',
            'device_model',
            'device_platform',
            'device_version',
            'efkLatGpsL1',
            'efkLngGpsL1',
            'efkAltGpsL1',
            'efkTimeGpsL1',
            'efkLatGpsL5',
            'efkLngGpsL5',
            'efkAltGpsL5',
            'efkTimeGpsL5',
            'efkLatGpsIf',
            'efkLngGpsIf',
            'efkAltGpsIf',
            'efkTimeGpsIf',
            'efkLatGalE1',
            'efkLngGalE1',
            'efkAltGalE1',
            'efkTimeGalE1',
            'efkLatGalE5',
            'efkLngGalE5',
            'efkAltGalE5',
            'efkTimeGalE5',
            'efkLatGalIf',
            'efkLngGalIf',
            'efkAltGalIf',
            'efkTimeGalIf',
            'timestamp',
            'note',
            'lat',
            'lng',
            'photo_heading',
            'created',
            'path',
            'file_name',
            'digest',
            'id'
        ])
        ->where('flg_deleted', 0);

    if ($task_id) {
        $query->where('task_id', $task_id);
    } elseif ($user_id) {
        $query->whereNull('task_id')->where('user_id', $user_id);
    } else {
        return $output;
    }

    $photos = $query->get();

    foreach ($photos as $photo) {
        $out = [
            'altitude' => $photo->altitude,
            'vertical_view_angle' => $photo->vertical_view_angle,
            'accuracy' => $photo->accuracy,
            'distance' => $photo->distance,
            'nmea_distance' => $photo->nmea_distance,
            'device_manufacture' => $photo->device_manufacture,
            'device_model' => $photo->device_model,
            'device_platform' => $photo->device_platform,
            'device_version' => $photo->device_version,
            'efkLatGpsL1' => $photo->efkLatGpsL1,
            'efkLngGpsL1' => $photo->efkLngGpsL1,
            'efkAltGpsL1' => $photo->efkAltGpsL1,
            'efkTimeGpsL1' => $photo->efkTimeGpsL1,
            'efkLatGpsL5' => $photo->efkLatGpsL5,
            'efkLngGpsL5' => $photo->efkLngGpsL5,
            'efkAltGpsL5' => $photo->efkAltGpsL5,
            'efkTimeGpsL5' => $photo->efkTimeGpsL5,
            'efkLatGpsIf' => $photo->efkLatGpsIf,
            'efkLngGpsIf' => $photo->efkLngGpsIf,
            'efkAltGpsIf' => $photo->efkAltGpsIf,
            'efkTimeGpsIf' => $photo->efkTimeGpsIf,
            'efkLatGalE1' => $photo->efkLatGalE1,
            'efkLngGalE1' => $photo->efkLngGalE1,
            'efkAltGalE1' => $photo->efkAltGalE1,
            'efkTimeGalE1' => $photo->efkTimeGalE1,
            'efkLatGalE5' => $photo->efkLatGalE5,
            'efkLngGalE5' => $photo->efkLngGalE5,
            'efkAltGalE5' => $photo->efkAltGalE5,
            'efkTimeGalE5' => $photo->efkTimeGalE5,
            'efkLatGalIf' => $photo->efkLatGalIf,
            'efkLngGalIf' => $photo->efkLngGalIf,
            'efkAltGalIf' => $photo->efkAltGalIf,
            'efkTimeGalIf' => $photo->efkTimeGalIf,
            'timestamp' => $photo->timestamp,
            'note' => $photo->note,
            'lat' => $photo->lat,
            'lng' => $photo->lng,
            'photo_heading' => $photo->photo_heading,
            'created' => $photo->created,
            'digest' => $photo->digest,
            'id' => $photo->id
        ];
        $file = null;
        $filePath = storage_path('app/private/' . $photo->path . $photo->file_name);
        if (file_exists($filePath)) {
            $file = file_get_contents($filePath);
        }
        $out['photo'] = base64_encode($file);
        $output[] = $out;
    }

    return $output;
}

function deletePath($photo_id)
{
    $affectedRows = DB::table('path')
        ->where('id', $photo_id)
        ->where('flg_deleted', 0)
        ->update([
            'flg_deleted' => 1,
        ]);

    return $affectedRows;
}

function deleteUnassignedPhoto($uid)
{
    $affectedRows = DB::table('photo')
        ->where('id', $uid)
        ->where('flg_deleted', 0)
        ->whereNull('task_id')
        ->update([
            'flg_deleted' => 1,
        ]);

    return $affectedRows;
}

function deleteSelectedUnassignedPhoto(array $uids)
{
    $affectedRows = DB::table('photo')
        ->whereIn('id', $uids) 
        ->where('flg_deleted', 0)
        ->whereNull('task_id')
        ->update([
            'flg_deleted' => 1,
        ]);

    return $affectedRows;
}

function getPhotosWithoutTask($user_id)
{
    $photos = DB::table('photo')
        ->select([
            'altitude',
            'vertical_view_angle',
            'distance',
            'nmea_distance',
            'accuracy',
            'device_manufacture',
            'device_model',
            'device_platform',
            'device_version',
            'efkLatGpsL1',
            'efkLngGpsL1',
            'efkAltGpsL1',
            'efkTimeGpsL1',
            'efkLatGpsL5',
            'efkLngGpsL5',
            'efkAltGpsL5',
            'efkTimeGpsL5',
            'efkLatGpsIf',
            'efkLngGpsIf',
            'efkAltGpsIf',
            'efkTimeGpsIf',
            'efkLatGalE1',
            'efkLngGalE1',
            'efkAltGalE1',
            'efkTimeGalE1',
            'efkLatGalE5',
            'efkLngGalE5',
            'efkAltGalE5',
            'efkTimeGalE5',
            'efkLatGalIf',
            'efkLngGalIf',
            'efkAltGalIf',
            'efkTimeGalIf',
            'note',
            'lat',
            'lng',
            'photo_heading',
            'created',
            'path',
            'file_name',
            'digest',
            'id'


        ])
        ->where('user_id', $user_id)
        ->where('flg_deleted', 0)
        ->whereNull('task_id')
        ->get();

    $output = [];

    foreach ($photos as $photo) {
        $photoData = [
            'altitude' => $photo->altitude,
            'vertical_view_angle' => $photo->vertical_view_angle,
            'accuracy' => $photo->accuracy,
            'distance' => $photo->distance,
            'nmea_distance' => $photo->nmea_distance,
            'device_manufacture' => $photo->device_manufacture,
            'device_model' => $photo->device_model,
            'device_platform' => $photo->device_platform,
            'device_version' => $photo->device_version,
            'efkLatGpsL1' => $photo->efkLatGpsL1,
            'efkLngGpsL1' => $photo->efkLngGpsL1,
            'efkAltGpsL1' => $photo->efkAltGpsL1,
            'efkTimeGpsL1' => $photo->efkTimeGpsL1,
            'efkLatGpsL5' => $photo->efkLatGpsL5,
            'efkLngGpsL5' => $photo->efkLngGpsL5,
            'efkAltGpsL5' => $photo->efkAltGpsL5,
            'efkTimeGpsL5' => $photo->efkTimeGpsL5,
            'efkLatGpsIf' => $photo->efkLatGpsIf,
            'efkLngGpsIf' => $photo->efkLngGpsIf,
            'efkAltGpsIf' => $photo->efkAltGpsIf,
            'efkTimeGpsIf' => $photo->efkTimeGpsIf,
            'efkLatGalE1' => $photo->efkLatGalE1,
            'efkLngGalE1' => $photo->efkLngGalE1,
            'efkAltGalE1' => $photo->efkAltGalE1,
            'efkTimeGalE1' => $photo->efkTimeGalE1,
            'efkLatGalE5' => $photo->efkLatGalE5,
            'efkLngGalE5' => $photo->efkLngGalE5,
            'efkAltGalE5' => $photo->efkAltGalE5,
            'efkTimeGalE5' => $photo->efkTimeGalE5,
            'efkLatGalIf' => $photo->efkLatGalIf,
            'efkLngGalIf' => $photo->efkLngGalIf,
            'efkAltGalIf' => $photo->efkAltGalIf,
            'efkTimeGalIf' => $photo->efkTimeGalIf,
            'note' => $photo->note,
            'lat' => $photo->lat,
            'lng' => $photo->lng,
            'photo_heading' => $photo->photo_heading,
            'created' => $photo->created,
            'digest' => $photo->digest,
            'id' => $photo->id

        ];

        $file = null;
        $filePath = storage_path('app/private/' . $photo->path . $photo->file_name);
        if (file_exists($filePath)) {
            $file = file_get_contents($filePath);
        }
        $photoData['photo'] = $file ? base64_encode($file) : null;
        $output[] = $photoData;
    }

    return $output;
}


function getPaths($user_id)
{
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
    return $output;
}
