<?php

namespace App\Console\Commands;

use App\Models\Land;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class ImportLandGeojson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-land-geojson {file? : The path to the GeoJSON file} 
                           {--truncate : Truncate the land table before import}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import GeoJSON data into the land table with bbox coordinate boundaries';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Memory limit: ' . ini_get('memory_limit'));
        
        $filePath = $this->argument('file') ?? 'public/SURREYPoint.geojson';
        $shouldTruncate = $this->option('truncate');
        
        $this->info('Importing GeoJSON file: ' . $filePath);
        
        if (!File::exists($filePath)) {
            $this->error('File not found: ' . $filePath);
            return 1;
        }
        
        try {
            $jsonData = json_decode(File::get($filePath), true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->error('Invalid JSON file: ' . json_last_error_msg());
                return 1;
            }
            
            $this->info('Total features found: ' . count($jsonData['features']));
            
            if ($shouldTruncate) {
                if ($this->confirm('Are you sure you want to truncate the land table? This will delete all existing data.')) {
                    DB::statement('TRUNCATE TABLE land CASCADE');
                    $this->info('Land table truncated.');
                } else {
                    $this->info('Truncate operation cancelled.');
                }
            }
            
            DB::beginTransaction();
            
            $count = 0;
            $skipped = 0;
            $bboxCount = 0;
            $noBboxCount = 0;
            $pointsCount = 0;
            $polygonsCount = 0;
            $errors = 0;
            
            $bar = $this->output->createProgressBar(count($jsonData['features']));
            
            foreach ($jsonData['features'] as $data) {
                $properties = $data['properties'];
                $geometry = $data['geometry'];
                $bbox = $data['bbox'] ?? null;
                
                // Use parcel_ref as main identificator
                $parcel_ref = $properties['parcel_ref'] ?? $properties['PARCEL_REF'] ?? null;
                
                // Get identificator from name property with Surrey prefix and index
                $name = $properties['name'] ?? $properties['NAME'] ?? null;
                $identificator = 'Surrey.' . ($count + 1);
                
                // Always use parcel_ref as pa_description like in ImportSurreyJsonData
                $pa_description = $parcel_ref;
                
                // Skip if no identificator or parcel_ref
                if (empty($parcel_ref)) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }
                
                // Calculate bbox if not provided
                $minLng = null;
                $maxLng = null;
                $minLat = null;
                $maxLat = null;
                
                if ($bbox) {
                    // bbox format is typically [minLng, minLat, maxLng, maxLat]
                    $minLng = $bbox[0];
                    $minLat = $bbox[1];
                    $maxLng = $bbox[2];
                    $maxLat = $bbox[3];
                    $bboxCount++;
                } else {
                    $noBboxCount++;
                    
                    // Handle different geometry types
                    if ($geometry['type'] === 'Point') {
                        // For Point, min and max are the same
                        $minLng = $maxLng = $geometry['coordinates'][0];
                        $minLat = $maxLat = $geometry['coordinates'][1];
                    } else {
                        // For other geometry types, calculate from bounding box helper
                        $this->calculateBboxFromGeometry($geometry, $minLng, $maxLng, $minLat, $maxLat);
                    }
                }
                
                // Convert geometry to JSON string
                $geomJson = json_encode($geometry);
                
                try {
                    // Count geometry types
                    if ($geometry['type'] === 'Point') {
                        $pointsCount++;
                        
                        // For Point geometries, create a small buffer to convert to Polygon
                        $lng = $geometry['coordinates'][0];
                        $lat = $geometry['coordinates'][1];
                        
                        // Insert using buffer with ST_Buffer to convert Point to Polygon
                        DB::statement(
                            "INSERT INTO land (identificator, pa_description, wkt, wgs_geometry, wgs_max_lat, wgs_min_lat, wgs_max_lng, wgs_min_lng) 
                            VALUES (?, ?, ?, ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, 1)::geometry), ?, ?, ?, ?)",
                            [
                                $identificator,
                                $pa_description,
                                $geometry['type'],
                                $lng,
                                $lat,
                                $maxLat,
                                $minLat,
                                $maxLng,
                                $minLng
                            ]
                        );
                    } else {
                        $polygonsCount++;
                        
                        // For other geometries, use normal GeoJSON import
                        DB::statement(
                            "INSERT INTO land (identificator, pa_description, wkt, wgs_geometry, wgs_max_lat, wgs_min_lat, wgs_max_lng, wgs_min_lng) 
                            VALUES (?, ?, ?, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)), ?, ?, ?, ?)",
                            [
                                $identificator,
                                $pa_description,
                                $geometry['type'],
                                $geomJson,
                                $maxLat,
                                $minLat,
                                $maxLng,
                                $minLng
                            ]
                        );
                    }
                    
                    $count++;
                } catch (\Exception $e) {
                    $errors++;
                    $this->info("\nError processing record: " . $e->getMessage());
                }
                
                if ($count % 100 === 0) {
                    DB::commit();
                    DB::beginTransaction();
                    $this->info("\n$count records inserted so far");
                }
                
                $bar->advance();
            }
            
            DB::commit();
            $bar->finish();
            $this->newLine(2);
            $this->info('Import completed successfully!');
            $this->info("Total records: $count inserted, $skipped skipped, $errors errors");
            $this->info("BBox statistics: $bboxCount records with bbox, $noBboxCount calculated from geometry");
            $this->info("Geometry statistics: $pointsCount Point geometries, $polygonsCount Polygon/MultiPolygon geometries");
            
            // Update sequence
            try {
                $sequenceExists = DB::select("SELECT 1 FROM pg_class WHERE relname = 'land_id_seq' AND relkind = 'S'");
                    
                if (!empty($sequenceExists)) {
                    DB::statement("SELECT setval('land_id_seq', (SELECT MAX(id) FROM land))");
                    $this->info('Sequence updated.');
                }
            } catch (\Exception $e) {
                $this->info('No sequence found for land table. Skipping sequence update.');
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error processing file: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
        
        return 0;
    }
    
    /**
     * Calculate bounding box from geometry
     * 
     * @param array $geometry The geometry object from GeoJSON
     * @param float &$minLng Minimum longitude
     * @param float &$maxLng Maximum longitude
     * @param float &$minLat Minimum latitude
     * @param float &$maxLat Maximum latitude
     */
    private function calculateBboxFromGeometry(array $geometry, &$minLng, &$maxLng, &$minLat, &$maxLat)
    {
        $type = $geometry['type'];
        $coordinates = $geometry['coordinates'];
        
        $lngs = [];
        $lats = [];
        
        if ($type === 'Polygon') {
            // Use the outer ring (first ring)
            $ring = $coordinates[0];
            foreach ($ring as $point) {
                $lngs[] = $point[0];
                $lats[] = $point[1];
            }
        } elseif ($type === 'MultiPolygon') {
            foreach ($coordinates as $polygon) {
                $ring = $polygon[0]; // Use the outer ring of each polygon
                foreach ($ring as $point) {
                    $lngs[] = $point[0];
                    $lats[] = $point[1];
                }
            }
        } elseif ($type === 'LineString') {
            foreach ($coordinates as $point) {
                $lngs[] = $point[0];
                $lats[] = $point[1];
            }
        } elseif ($type === 'MultiLineString') {
            foreach ($coordinates as $lineString) {
                foreach ($lineString as $point) {
                    $lngs[] = $point[0];
                    $lats[] = $point[1];
                }
            }
        }
        
        if (!empty($lngs) && !empty($lats)) {
            $minLng = min($lngs);
            $maxLng = max($lngs);
            $minLat = min($lats);
            $maxLat = max($lats);
        }
    }
} 