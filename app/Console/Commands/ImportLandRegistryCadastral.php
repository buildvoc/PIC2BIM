<?php

namespace App\Console\Commands;

use App\Models\LandRegistryCadastral;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportLandRegistryCadastral extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Allow an optional path argument. If not provided, defaults to public/Land_Registry_Cadastral_Parcels_Surrey_sample.geojson
     * Example: php artisan app:import-land-registry-cadastral storage/data/cadastral.geojson
     *
     * @var string
     */
    protected $signature = 'app:import-land-registry-cadastral {path?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import Land Registry Cadastral Parcels GeoJSON data into land_registry_cadastral table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Use provided path or default
        $filePath = $this->argument('path') ?: public_path('Land_registry_export_qgis.geojson');
        
        if (!File::exists($filePath)) {
            $this->error("GeoJSON file not found: {$filePath}");
            return 1;
        }

        $this->info("Reading GeoJSON file: {$filePath}");
        $json = File::get($filePath);
        $jsonData = json_decode($json, true);

        if (!is_array($jsonData) || !isset($jsonData['features']) || !is_array($jsonData['features'])) {
            $this->error('Invalid GeoJSON format. "features" key not found or invalid.');
            return 1;
        }

        $features = $jsonData['features'];
        $total = count($features);
        
        $this->info('Total Land Registry Cadastral features found: ' . $total);

        $bar = $this->output->createProgressBar($total);
        $bar->start();
        
        $processed = 0;
        $errors = 0;
        
        // Process in chunks for better memory management
        $chunkSize = 500; // Smaller chunks for geometry-heavy data
        $chunks = array_chunk($features, $chunkSize);
        
        foreach ($chunks as $chunkIndex => $chunk) {
            DB::beginTransaction();
            
            try {
                foreach ($chunk as $feature) {
                    $bar->advance();
                    
                    try {
                        $properties = $feature['properties'] ?? [];
                        $geometry = $feature['geometry'] ?? null;

                        // Extract fields with fallbacks based on GeoJSON structure
                        $fid = $properties['FID'] ?? null;
                        $countyCode = $properties['CTY24CD'] ?? null;
                        $countyName = $properties['CTY24NM'] ?? null;
                        $bngEasting = $properties['BNG_E'] ?? null;
                        $bngNorthing = $properties['BNG_N'] ?? null;
                        $longitude = $properties['LONG'] ?? null;
                        $latitude = $properties['LAT'] ?? null;
                        $globalId = $properties['GlobalID'] ?? null;

                        if ($fid === null || $countyCode === null) {
                            $this->warn("\nSkipping a feature without FID or County Code.");
                            $errors++;
                            continue;
                        }

                        // Create or update by FID and county_code as the business key (without geometry first)
                        $record = LandRegistryCadastral::updateOrCreate([
                            'fid' => $fid,
                            'county_code' => $countyCode,
                        ], [
                            'county_name' => $countyName,
                            'bng_easting' => $bngEasting,
                            'bng_northing' => $bngNorthing,
                            'longitude' => $longitude,
                            'latitude' => $latitude,
                            'global_id' => $globalId,
                        ]);

                        // Update geometry separately using raw SQL for proper PostGIS handling
                        if ($geometry && !empty($geometry['coordinates']) && $geometry['type'] === 'MultiPolygon') {
                            $geometryJson = json_encode($geometry);
                            
                            // Insert WGS84 geometry (EPSG:4326) - original coordinates from GeoJSON
                            DB::statement(
                                "UPDATE land_registry_cadastral SET geometry = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) WHERE fid = ? AND county_code = ?",
                                [$geometryJson, $fid, $countyCode]
                            );
                            
                            // Convert and store BNG geometry (EPSG:27700) if BNG coordinates are available
                            if ($bngEasting && $bngNorthing) {
                                // Transform WGS84 geometry to BNG
                                DB::statement(
                                    "UPDATE land_registry_cadastral SET geometry_bng = ST_Transform(geometry, 27700) WHERE fid = ? AND county_code = ?",
                                    [$fid, $countyCode]
                                );
                            }
                        }

                        $processed++;

                    } catch (\Throwable $e) {
                        $id = $feature['properties']['FID'] ?? 'N/A';
                        $county = $feature['properties']['CTY24CD'] ?? 'N/A';
                        $this->warn("\nSkipping record with FID: {$id}, County: {$county}. Error: " . $e->getMessage());
                        $errors++;
                        continue;
                    }
                }
                
                DB::commit();
                $this->info("\nCompleted chunk " . ($chunkIndex + 1) . " of " . count($chunks));
                
            } catch (\Throwable $e) {
                DB::rollBack();
                $this->error("\nTransaction failed for chunk " . ($chunkIndex + 1) . ". Error: " . $e->getMessage());
                $errors += count($chunk);
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info('Land Registry Cadastral import completed!');
        $this->info("Total records successfully processed: {$processed}");
        
        if ($errors > 0) {
            $this->warn("Total errors encountered: {$errors}");
        }

        // Show some statistics
        $totalRecords = LandRegistryCadastral::count();
        $recordsWithGeometry = LandRegistryCadastral::whereRaw('geometry IS NOT NULL')->count();
        $recordsWithBngGeometry = LandRegistryCadastral::whereRaw('geometry_bng IS NOT NULL')->count();
        
        $this->info("Database statistics:");
        $this->info("- Total records in database: {$totalRecords}");
        $this->info("- Records with WGS84 geometry: {$recordsWithGeometry}");
        $this->info("- Records with BNG geometry: {$recordsWithBngGeometry}");

        return 0;
    }
}
