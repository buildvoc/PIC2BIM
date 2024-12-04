<?php

namespace App\Console\Commands;

use App\Models\Land;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ImportSurreyJsonData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-surrey-json-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        dump(ini_get('memory_limit'));
        $filePath = public_path('SURREY.json');
        $jsonData = json_decode(File::get($filePath), true);
        foreach ($jsonData['features'] as $data){
            $land = [
                'pa_description' => $data['properties']['parcel_ref'],
                'identificator' => $data['id'] ?? null,
                'wkt' => $data['geometry']['type'] ?? null,
                'wgs_geometry' => $data['geometry']['coordinates'],
                'wgs_max_lat' => $data['bbox'][1],
                'wgs_min_lat' => $data['bbox'][3],
                'wgs_max_lng' => $data['bbox'][0],
                'wgs_min_lng' => $data['bbox'][2]
            ];

            $landData = Land::create($land);
            $this->info(' Record inserted with id => ' . $landData->id);
        }
    }
}
