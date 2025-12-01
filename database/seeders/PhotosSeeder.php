<?php

namespace Database\Seeders;

use App\Models\Photo;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class PhotosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $farmer = User::where('email',env('TEST_FARMER_EMAIL'))->first(); 
        $task = Task::where('user_id',$farmer->id)->first();


        $sourcePath = public_path('images/img1.jpeg');
        $sourcePath2 = public_path('images/img2.jpeg');
        $sourcePath3 = public_path('images/img3.jpeg');
        $destinationPath = 'photos4all/'.$farmer->pa_id.'/'.$farmer->id.'/';


        if (file_exists($sourcePath)) {
            Storage::disk('public')->makeDirectory($destinationPath);
            copy($sourcePath, storage_path('app/public/'.$destinationPath.'img1.jpeg'));
            copy($sourcePath2, storage_path('app/public/'.$destinationPath.'img2.jpeg'));
            copy($sourcePath3, storage_path('app/public/'.$destinationPath.'img3.jpeg'));
        }


        Photo::insert([
            'user_id' => $farmer->id,
            'task_id' => $task->id,
            'note' => '',
            'lat' => 51.21645,
            'lng' => -0.800048,
            'centroidLat' => null,
            'centroidLng' => null,
            'altitude' => 125.755,
            'created' => '2024-12-26 17:15:05',
            'bearing' => -1,
            'magnetic_azimuth' => 164.325,
            'photo_heading' => 164.325,
            'photo_angle' => 68.3774,
            'roll' => -0.0942066,
            'pitch' => 1.19341,
            'orientation' => 1,
            'horizontal_view_angle' => null,
            'vertical_view_angle' => null,
            'accuracy' => 3.28772,
            'device_manufacture' => 'Apple',
            'device_model' => '?unrecognized?',
            'device_platform' => 'iOS',
            'device_version' => '18.2',
            'sats_info' => null,
            'extra_sat_count' => null,
            'nmea_msg' => null,
            'nmea_location' => null,
            'nmea_distance' => null,
            'network_info' => null,
            'network_location' => null,
            'distance' => null,
            'flg_checked_location' => null,
            'path' => $destinationPath,
            'file_name' => 'img1.jpeg',
            'timestamp' => '2024-12-26 17:15:33',
            'digest' => '3bedc70c654b942b40a55c2bd39260700eefd0f715d744ff0c25add4f9f69dc1',
            'flg_original' => 1,
            'rotation_correction' => 0,
            'flg_deleted' => 0,
        ]);


        Photo::insert([
            'user_id' => $farmer->id,
            'task_id' => null,
            'note' => '',
            'lat' => 51.21321,
            'lng' => -0.79380924,
            'centroidLat' => null,
            'centroidLng' => null,
            'altitude' => 71.1269,
            'created' => '2024-12-26 17:15:05',
            'bearing' => -1,
            'magnetic_azimuth' => 164.325,
            'photo_heading' => 164.325,
            'photo_angle' => 68.3774,
            'roll' => -0.0942066,
            'pitch' => 1.19341,
            'orientation' => 1,
            'horizontal_view_angle' => null,
            'vertical_view_angle' => null,
            'accuracy' => 3.28772,
            'device_manufacture' => 'Apple',
            'device_model' => '?unrecognized?',
            'device_platform' => 'iOS',
            'device_version' => '18.2',
            'sats_info' => null,
            'extra_sat_count' => null,
            'nmea_msg' => null,
            'nmea_location' => null,
            'nmea_distance' => null,
            'network_info' => null,
            'network_location' => null,
            'distance' => null,
            'flg_checked_location' => null,
            'path' => $destinationPath,
            'file_name' => 'img2.jpeg',
            'timestamp' => '2024-12-26 17:15:33',
            'digest' => '3bedc70c654b942b40a55c2bd39260700eefd0f715d744ff0c25add4f9f69dc2',
            'flg_original' => 1,
            'rotation_correction' => 0,
            'flg_deleted' => 0,
        ]);

        Photo::insert([
            'user_id' => $farmer->id,
            'task_id' => null,
            'note' => '',
            'lat' => 51.91321,
            'lng' => -0.71380924,
            'centroidLat' => null,
            'centroidLng' => null,
            'altitude' => 71.5269,
            'created' => '2024-12-26 17:15:05',
            'bearing' => -1,
            'magnetic_azimuth' => 164.325,
            'photo_heading' => 164.325,
            'photo_angle' => 68.3774,
            'roll' => -0.0942066,
            'pitch' => 1.19341,
            'orientation' => 1,
            'horizontal_view_angle' => null,
            'vertical_view_angle' => null,
            'accuracy' => 3.28772,
            'device_manufacture' => 'Apple',
            'device_model' => '?unrecognized?',
            'device_platform' => 'iOS',
            'device_version' => '18.2',
            'sats_info' => null,
            'extra_sat_count' => null,
            'nmea_msg' => null,
            'nmea_location' => null,
            'nmea_distance' => null,
            'network_info' => null,
            'network_location' => null,
            'distance' => null,
            'flg_checked_location' => null,
            'path' => $destinationPath,
            'file_name' => 'img3.jpeg',
            'timestamp' => '2024-12-26 17:15:33',
            'digest' => '3bedc70c654b942b40a55c2bd39260700eefd0f715d744ff0c25add4f9f69dc3',
            'flg_original' => 1,
            'rotation_correction' => 0,
            'flg_deleted' => 0,
        ]);
    }
}
