<?php

namespace App\Console\Commands;

use App\Models\NHLE;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ImportNHLEJson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-nhle-json';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import NHLE GeoJSON data into the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = public_path('nhle2.geojson');
        if (!File::exists($filePath)) {
            $this->error('nhle2.geojson not found in public path.');
            return 1;
        }

        $jsonData = json_decode(File::get($filePath), true);

        if (!isset($jsonData['features'])) {
            $this->error('Invalid GeoJSON format. "features" key not found.');
            return 1;
        }

        $features = $jsonData['features'];
        $total = count($features);
        $this->info('Total features found: ' . $total);
        $bar = $this->output->createProgressBar($total);

        $count = 0;
        foreach ($features as $data) {
            $bar->advance();
            try {
                $properties = $data['properties'];
                $geometry = $data['geometry'];

                $coordinates = $geometry['coordinates'][0] ?? [null, null];

                $nhle = NHLE::updateOrCreate([
                    'listentry' => $properties['listentry']
                ], [
                    'objectid' => $properties['objectid'] ?? null,
                    'name' => $properties['name'] ?? null,
                    'grade' => $properties['grade'] ?? null,
                    'listdate' => isset($properties['listdate']) ? Carbon::parse($properties['listdate'])->toDateString() : null,
                    'amenddate' => isset($properties['amenddate']) ? Carbon::parse($properties['amenddate'])->toDateString() : null,
                    'capturesca' => $properties['capturescale'] ?? null,
                    'hyperlink' => $properties['hyperlink'] ?? null,
                    'ngr' => $properties['ngr'] ?? null,
                    'easting' => $properties['easting'] ?? null,
                    'northing' => $properties['northing'] ?? null,
                    'longitude' => $coordinates[0],
                    'latitude' => $coordinates[1],
                ]);

                if (isset($geometry) && !empty($geometry['coordinates'])) {
                    $geomJson = json_encode($geometry);
                    DB::table('nhle_')
                        ->where('gid', $nhle->gid)
                        ->update(['geom' => DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('$geomJson'), 4326), 27700)")]);
                }

                $count++;
            } catch (\Exception $e) {
                $listentry = $data['properties']['listentry'] ?? 'N/A';
                $this->warn("\nSkipping record with listentry: {$listentry}. Error: " . $e->getMessage());
                continue;
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('NHLE import completed!');
        $this->info("Total records successfully processed: $count");

        return 0;
    }
}
