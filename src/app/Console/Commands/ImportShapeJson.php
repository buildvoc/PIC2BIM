<?php

namespace App\Console\Commands;

use App\Models\Land;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ImportShapeJson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-shape-json';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import Shapes Json';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = public_path('SHAPES.json');
        $jsonData = json_decode(File::get($filePath), true);

        foreach ($jsonData['features'] as $data) {
            $coordinatesData = $data['geometry']['coordinates'];
            $xVals = [];
            $yVals = [];
            $coordinates = [];
            foreach ($coordinatesData as $coordinateData) {
                foreach ($coordinateData as $cData) {
                    $coordinates = $cData;
                    foreach ($cData as $cd) {
                        array_push($xVals, $cd[0]);
                        array_push($yVals, $cd[1]);
                    }
                }
            }
            
            if(count($xVals) == 0 || count($yVals) == 0 ) continue;
            $minLatitude = min($xVals);
            $maxLatitude = max($xVals);
            $minLongitude = min($yVals);
            $maxLongitude = max($yVals);

            $land = [
                'pa_description' => $data['properties']['WD24NM'],
                'identificator' => $data['properties']['WD24CD'] ?? null,
                'wkt' => $data['geometry']['type'] ?? null,
                'wgs_geometry' => $coordinates,
                'wgs_max_lat' => $maxLatitude,
                'wgs_min_lat' => $minLatitude,
                'wgs_max_lng' => $maxLongitude,
                'wgs_min_lng' => $minLongitude
            ];

            $landData = Land::create($land);
            $this->info(' Record inserted with id => ' . $landData->id);
        }
    }
}
