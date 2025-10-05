<?php

namespace App\Console\Commands;

use App\Models\LandRegistryInspire;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportLandRegistryInspire extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Allow an optional path argument. If not provided, defaults to public/Land_registry_export_qgis.geojson
     * Example: php artisan app:import-land-registry-inspire storage/data/inspire.geojson
     *
     * @var string
     */
    protected $signature = 'app:import-land-registry-inspire {path?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import Land Registry INSPIRE GeoJSON data into land_registry_inspire table';

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
        
        $this->info('Total Land Registry INSPIRE features found: ' . $total);

        // Check coordinate system from CRS
        $crs = $jsonData['crs'] ?? null;
        $isEPSG27700 = false;
        if ($crs && isset($crs['properties']['name'])) {
            $crsName = $crs['properties']['name'];
            $isEPSG27700 = strpos($crsName, '27700') !== false;
            $this->info("Detected CRS: {$crsName}");
            if ($isEPSG27700) {
                $this->info("Data is in British National Grid (EPSG:27700) - will transform to WGS84");
            }
        }

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

                        // Extract INSPIRE fields
                        $gmlId = $properties['gml_id'] ?? null;
                        $inspireId = $properties['INSPIREID'] ?? null;
                        $label = $properties['LABEL'] ?? null;
                        $nationalCadastralReference = $properties['NATIONALCADASTRALREFERENCE'] ?? null;
                        $validFrom = $properties['VALIDFROM'] ?? null;
                        $beginLifespanVersion = $properties['BEGINLIFESPANVERSION'] ?? null;

                        if ($gmlId === null || $inspireId === null) {
                            $this->warn("\nSkipping a feature without gml_id or INSPIREID.");
                            $errors++;
                            continue;
                        }

                        // Convert datetime strings to proper format
                        $validFromDate = null;
                        $beginLifespanDate = null;
                        
                        if ($validFrom) {
                            try {
                                $validFromDate = \Carbon\Carbon::parse($validFrom)->format('Y-m-d H:i:s');
                            } catch (\Exception $e) {
                                $this->warn("\nInvalid VALIDFROM date format for gml_id: {$gmlId}");
                            }
                        }
                        
                        if ($beginLifespanVersion) {
                            try {
                                $beginLifespanDate = \Carbon\Carbon::parse($beginLifespanVersion)->format('Y-m-d H:i:s');
                            } catch (\Exception $e) {
                                $this->warn("\nInvalid BEGINLIFESPANVERSION date format for gml_id: {$gmlId}");
                            }
                        }

                        // Create or update by gml_id as the business key (without geometry first)
                        $record = LandRegistryInspire::updateOrCreate([
                            'gml_id' => $gmlId,
                        ], [
                            'INSPIREID' => $inspireId,
                            'LABEL' => $label,
                            'NATIONALCADASTRALREFERENCE' => $nationalCadastralReference,
                            'VALIDFROM' => $validFromDate,
                            'BEGINLIFESPANVERSION' => $beginLifespanDate,
                        ]);

                        // Update geometry separately using raw SQL for proper PostGIS handling
                        if ($geometry && !empty($geometry['coordinates'])) {
                            $geometryJson = json_encode($geometry);
                            
                            if ($isEPSG27700) {
                                // Data is in BNG (EPSG:27700), insert as BNG then transform to WGS84
                                DB::statement(
                                    "UPDATE land_registry_inspire SET geom = ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 27700), 4326) WHERE gml_id = ?",
                                    [$geometryJson, $gmlId]
                                );
                            } else {
                                // Data is already in WGS84 (EPSG:4326)
                                DB::statement(
                                    "UPDATE land_registry_inspire SET geom = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) WHERE gml_id = ?",
                                    [$geometryJson, $gmlId]
                                );
                            }
                        }

                        $processed++;

                    } catch (\Throwable $e) {
                        $gmlId = $feature['properties']['gml_id'] ?? 'N/A';
                        $inspireId = $feature['properties']['INSPIREID'] ?? 'N/A';
                        $this->warn("\nSkipping record with gml_id: {$gmlId}, INSPIREID: {$inspireId}. Error: " . $e->getMessage());
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
        $this->info('Land Registry INSPIRE import completed!');
        $this->info("Total records successfully processed: {$processed}");
        
        if ($errors > 0) {
            $this->warn("Total errors encountered: {$errors}");
        }

        // Show some statistics
        $totalRecords = LandRegistryInspire::count();
        $recordsWithGeometry = LandRegistryInspire::whereRaw('geom IS NOT NULL')->count();
        
        $this->info("Database statistics:");
        $this->info("- Total records in database: {$totalRecords}");
        $this->info("- Records with geometry: {$recordsWithGeometry}");

        return 0;
    }
}
