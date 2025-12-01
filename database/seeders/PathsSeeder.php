<?php

namespace Database\Seeders;

use App\Models\Path;
use App\Models\PathPoint;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PathsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $farmer = User::where('email',env('TEST_FARMER_EMAIL'))->first();
        $path = Path::create([
            'user_id' => $farmer->id,
            'name' => 'heritage trail 02',
            'device_manufacture' => 'Samsung',
            'device_model' => 'gactive3',
            'device_platform' => 'Android',
            'device_version' => 13,
            'start' => now(),
            'end' => now(),
            'area' => 24497.12,
            'flg_deleted' => 0,
            'timestamp' => now()
        ]);

        $data = [
            ['lat' => 51.2188521, 'lng' => -0.7944671, 'altitude' => 129, 'accuracy' => 4.329, 'created' => now()],
            ['lat' => 51.2188533, 'lng' => -0.7944709, 'altitude' => 129, 'accuracy' => 3.996, 'created' => now()],
            ['lat' => 51.2188488, 'lng' => -0.7944889, 'altitude' => 129, 'accuracy' => 3.996, 'created' => now()],
            ['lat' => 51.2188425, 'lng' => -0.7945112, 'altitude' => 129, 'accuracy' => 3.996, 'created' => now()],
            ['lat' => 51.2188355, 'lng' => -0.7945398, 'altitude' => 128.9, 'accuracy' => 3.873, 'created' => now()],
            ['lat' => 51.2188273, 'lng' => -0.794571, 'altitude' => 128.9, 'accuracy' => 4.352, 'created' => now()],
            ['lat' => 51.2188142, 'lng' => -0.7946069, 'altitude' => 128.9, 'accuracy' => 4.159, 'created' => now()],
            ['lat' => 51.2187981, 'lng' => -0.7946472, 'altitude' => 128.9, 'accuracy' => 4.352, 'created' => now()],
            ['lat' => 51.2187811, 'lng' => -0.794693, 'altitude' => 128.9, 'accuracy' => 4.352, 'created' => now()],
            ['lat' => 51.2187601, 'lng' => -0.7947399, 'altitude' => 128.9, 'accuracy' => 2.833, 'created' => now()],
            ['lat' => 51.2187386, 'lng' => -0.7947833, 'altitude' => 128.9, 'accuracy' => 2.6, 'created' => now()],
            ['lat' => 51.2187183, 'lng' => -0.794821, 'altitude' => 128.9, 'accuracy' => 2.4, 'created' => now()],
            ['lat' => 51.2187015, 'lng' => -0.7948462, 'altitude' => 128.9, 'accuracy' => 2.333, 'created' => now()],
            ['lat' => 51.2186911, 'lng' => -0.7948605, 'altitude' => 128.9, 'accuracy' => 2, 'created' => now()],
            ['lat' => 51.2186918, 'lng' => -0.7948612, 'altitude' => 128.9, 'accuracy' => 2, 'created' => now()],
            ['lat' => 51.2186956, 'lng' => -0.7948596, 'altitude' => 128.9, 'accuracy' => 2, 'created' => now()],
            ['lat' => 51.2186972, 'lng' => -0.7948602, 'altitude' => 128.9, 'accuracy' => 2, 'created' => now()],
            ['lat' => 51.2186984, 'lng' => -0.7948609, 'altitude' => 128.9, 'accuracy' => 2, 'created' => now()],
            ['lat' => 51.2187001, 'lng' => -0.7948611, 'altitude' => 128.3, 'accuracy' => 3.105, 'created' => now()],
            ['lat' => 51.2187007, 'lng' => -0.7948602, 'altitude' => 128.3, 'accuracy' => 3.105, 'created' => now()],
            ['lat' => 51.2187008, 'lng' => -0.7948605, 'altitude' => 128.3, 'accuracy' => 3.105, 'created' => now()],
            ['lat' => 51.2187009, 'lng' => -0.7948605, 'altitude' => 128.3, 'accuracy' => 3.105, 'created' => now()],
            ['lat' => 51.2187013, 'lng' => -0.7948601, 'altitude' => 128.3, 'accuracy' => 3.105, 'created' => now()],
            ['lat' => 51.2187012, 'lng' => -0.7948603, 'altitude' => 128.5, 'accuracy' => 3.389, 'created' => now()],
            ['lat' => 51.2187015, 'lng' => -0.7948602, 'altitude' => 128.5, 'accuracy' => 3.389, 'created' => now()],
        ];

        foreach ($data as &$record) {
            $record['path_id'] = $path->id;
        }

        PathPoint::insert($data);
    }
}
