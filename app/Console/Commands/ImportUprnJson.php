<?php
namespace App\Console\Commands;

use App\Models\Attr\Uprn;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportUprnJson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Allow an optional path argument. If not provided, defaults to public/osopenuprn.geojson
     * Example: php artisan app:import-uprn-json storage/data/osopenuprn.geojson
     *
     * @var string
     */
    protected $signature = 'app:import-uprn-json {path?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import OS Open UPRN GeoJSON data into osopenuprn_address table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Use provided path or default
        $filePath = $this->argument('path') ?: public_path('sampleuprn.geojson');
        
        if (!File::exists($filePath)) {
            $this->error("GeoJSON file not found: {$filePath}");
            return 1;
        }

        $json = File::get($filePath);
        $jsonData = json_decode($json, true);

        if (!is_array($jsonData) || !isset($jsonData['features']) || !is_array($jsonData['features'])) {
            $this->error('Invalid GeoJSON format. "features" key not found or invalid.');
            return 1;
        }

        $features = $jsonData['features'];
        $total = count($features);
        
        $this->info('Total UPRN features found: ' . $total);

        $bar = $this->output->createProgressBar($total);
        $bar->start();
        
        $processed = 0;
        $errors = 0;
        
        // Process in chunks for better memory management
        $chunkSize = 1000;
        $chunks = array_chunk($features, $chunkSize);
        
        foreach ($chunks as $chunk) {
            DB::beginTransaction();
            
            try {
                foreach ($chunk as $feature) {
                    $bar->advance();
                    
                    try {
                        $properties = $feature['properties'] ?? [];
                        $geometry = $feature['geometry'] ?? null;

                        // Extract fields with fallbacks
                        $fid = $properties['FID'] ?? null;
                        $uprn = $properties['UPRN'] ?? null;
                        $x = $properties['X_COORDINATE'] ?? null;
                        $y = $properties['Y_COORDINATE'] ?? null;
                        $lat = $properties['LATITUDE'] ?? null;
                        $lon = $properties['LONGITUDE'] ?? null;

                        if ($uprn === null) {
                            $this->warn("\nSkipping a feature without UPRN.");
                            $errors++;
                            continue;
                        }

                        // Create or update by UPRN as the business key (without geometry first)
                        $record = Uprn::updateOrCreate([
                            'uprn' => $uprn,
                        ], [
                            'fid' => $fid,
                            'x_coordinate' => $x,
                            'y_coordinate' => $y,
                            'latitude' => $lat,
                            'longitude' => $lon,
                        ]);

                        // Update geometry separately using raw SQL
                        if ($geometry && !empty($geometry['coordinates']) && $geometry['type'] === 'Point') {
                            $x_coord = $geometry['coordinates'][0];
                            $y_coord = $geometry['coordinates'][1];
                            
                            // Use direct coordinate values, not variables to avoid SQL injection issues
                            DB::statement(
                                "UPDATE osopenuprn_address SET geom = ST_SetSRID(ST_MakePoint(?, ?), 27700) WHERE uprn = ?",
                                [$x_coord, $y_coord, $uprn]
                            );
                        }

                        $processed++;

                    } catch (\Throwable $e) {
                        $id = $feature['properties']['UPRN'] ?? 'N/A';
                        $this->warn("\nSkipping record with UPRN: {$id}. Error: " . $e->getMessage());
                        $errors++;
                        continue;
                    }
                }
                
                DB::commit();
                
            } catch (\Throwable $e) {
                DB::rollBack();
                $this->error("\nTransaction failed for chunk. Error: " . $e->getMessage());
                $errors += count($chunk);
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('UPRN import completed!');
        $this->info("Total records successfully processed: {$processed}");
        
        if ($errors > 0) {
            $this->warn("Total errors encountered: {$errors}");
        }

        return 0;
    }
}