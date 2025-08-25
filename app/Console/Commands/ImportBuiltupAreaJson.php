<?php

namespace App\Console\Commands;

use App\Models\BuiltupArea;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class ImportBuiltupAreaJson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-builtup-area-json {file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import Built-up Area data from a JSON file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file');
        $jsonData = json_decode(File::get($filePath), true);

        if (!$jsonData || !isset($jsonData['features'])) {
            $this->error('Invalid JSON file or format.');
            return 1;
        }

        $total = count($jsonData['features']);
        $this->info('Total features found: ' . $total);
        $bar = $this->output->createProgressBar($total);

        $count = 0;
        foreach ($jsonData['features'] as $data) {
            BuiltupArea::updateOrCreate([
                'fid' => $data['properties']['fid']
            ], [
                'objectid_1' => $data['properties']['OBJECTID_1'],
                'gsscode' => $data['properties']['gsscode'],
                'bua24cd' => $data['properties']['BUA24CD'],
                'bua24nm' => $data['properties']['BUA24NM'],
                'bua24nmw' => $data['properties']['BUA24NMW'],
                'geometry_a' => $data['properties']['geometry_a'],
                'areahectar' => $data['properties']['areahectar'],
                'globalid' => $data['properties']['GlobalID'],
                'geometry' => isset($data['geometry']) ? DB::raw("ST_SetSRID(ST_GeomFromGeoJSON('" . json_encode($data['geometry']) . "'), 27700)") : null,
            ]);

            $count++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('ONS BUA import completed!');
        $this->info("Total features processed: $count");

        return 0;
    }
}
