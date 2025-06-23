<?php

namespace App\Console\Commands;

use App\Models\Attr\Uprn;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class ImportUprnGeojson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-uprn-geojson {file? : The path to the GeoJSON file} 
                            {--truncate : Truncate the uprn table before import} 
                            {--skip-existing : Skip existing records based on uprn} 
                            {--update-existing : Update existing records based on uprn}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import UPRN GeoJSON data into the osopenuprn_address table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file') ?? 'public/osopenuprn_address-Ward-South-East-Farnham-Castle.geojson';
        $shouldTruncate = $this->option('truncate');
        $skipExisting = $this->option('skip-existing');
        $updateExisting = $this->option('update-existing');
        
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
                if ($this->confirm('Are you sure you want to truncate the osopenuprn_address table? This will delete all existing data.')) {
                    DB::connection('pgsql')->statement('TRUNCATE TABLE osopenuprn_address CASCADE');
                    $this->info('osopenuprn_address table truncated.');
                } else {
                    $this->info('Truncate operation cancelled.');
                }
            }
            
            // Get existing uprn values if we need to skip or update existing records
            $existingUprns = [];
            if ($skipExisting || $updateExisting) {
                $existingUprns = DB::connection('pgsql')
                    ->table('osopenuprn_address')
                    ->whereNotNull('uprn')
                    ->pluck('fid', 'uprn')
                    ->toArray();
                
                $this->info("Found " . count($existingUprns) . " existing UPRN records");
            }
            
            // Get the max fid to start from
            $maxFid = DB::connection('pgsql')->table('osopenuprn_address')->max('fid') ?? 0;
            $this->info("Starting with FID: " . ($maxFid + 1));
            
            $bar = $this->output->createProgressBar(count($jsonData['features']));
            
            DB::connection('pgsql')->beginTransaction();
            
            try {
                $count = 0;
                $skipped = 0;
                $updated = 0;
                
                foreach ($jsonData['features'] as $index => $feature) {
                    $properties = $feature['properties'];
                    $geometry = $feature['geometry'];
                    
                    // Extract fields from properties (case-insensitive)
                    $fid = $this->getPropertyValue($properties, 'FID');
                    $uprn = $this->getPropertyValue($properties, 'UPRN');
                    $x_coordinate = $this->getPropertyValue($properties, 'X_COORDINATE');
                    $y_coordinate = $this->getPropertyValue($properties, 'Y_COORDINATE');
                    $latitude = $this->getPropertyValue($properties, 'LATITUDE');
                    $longitude = $this->getPropertyValue($properties, 'LONGITUDE');
                    
                    // Skip if no uprn
                    if (empty($uprn)) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }
                    
                    // Check if record already exists and handle according to options
                    if (array_key_exists($uprn, $existingUprns)) {
                        if ($skipExisting) {
                            $skipped++;
                            $bar->advance();
                            continue;
                        } elseif ($updateExisting) {
                            // Update existing record
                            $existingFid = $existingUprns[$uprn];
                            $geomStr = json_encode($geometry);
                            
                            DB::connection('pgsql')->statement(
                                "UPDATE osopenuprn_address SET 
                                x_coordinate = ?, 
                                y_coordinate = ?, 
                                latitude = ?, 
                                longitude = ?, 
                                geom = ST_SetSRID(ST_GeomFromGeoJSON(?), 27700)
                                WHERE fid = ?",
                                [
                                    $x_coordinate,
                                    $y_coordinate,
                                    $latitude,
                                    $longitude,
                                    $geomStr,
                                    $existingFid
                                ]
                            );
                            
                            $updated++;
                            $bar->advance();
                            continue;
                        }
                    }
                    
                    // Insert new record
                    $newFid = $fid ?? ($maxFid + $index + 1);
                    $geomStr = json_encode($geometry);
                    
                    DB::connection('pgsql')->statement(
                        "INSERT INTO osopenuprn_address (fid, uprn, x_coordinate, y_coordinate, latitude, longitude, geom) 
                        VALUES (?, ?, ?, ?, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 27700))",
                        [
                            $newFid,
                            $uprn,
                            $x_coordinate,
                            $y_coordinate,
                            $latitude,
                            $longitude,
                            $geomStr
                        ]
                    );
                    
                    $count++;
                    $bar->advance();
                    
                    if (($count + $updated) % 100 == 0) {
                        DB::connection('pgsql')->commit();
                        DB::connection('pgsql')->beginTransaction();
                        $this->info("\nCommitted records: $count inserted, $updated updated");
                    }
                }
                
                DB::connection('pgsql')->commit();
                $bar->finish();
                $this->newLine(2);
                $this->info('Import completed successfully!');
                $this->info("Total records: $count inserted, $updated updated, $skipped skipped");
                
                // Check if sequence exists before updating it
                try {
                    $sequenceExists = DB::connection('pgsql')
                        ->select("SELECT 1 FROM pg_class WHERE relname = 'osopenuprn_address_fid_seq' AND relkind = 'S'");
                        
                    if (!empty($sequenceExists)) {
                        DB::connection('pgsql')->statement("SELECT setval('osopenuprn_address_fid_seq', (SELECT MAX(fid) FROM osopenuprn_address))");
                        $this->info('Sequence updated.');
                    }
                } catch (\Exception $e) {
                    $this->info('No sequence found for osopenuprn_address table. Skipping sequence update.');
                }
                
            } catch (\Exception $e) {
                DB::connection('pgsql')->rollBack();
                $this->error('Error importing data: ' . $e->getMessage());
                return 1;
            }
            
        } catch (\Exception $e) {
            $this->error('Error processing file: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }

    /**
     * Get property value with case-insensitive lookup
     */
    private function getPropertyValue($properties, $key)
    {
        // Direct match
        if (array_key_exists($key, $properties)) {
            return $properties[$key];
        }
        
        // Case-insensitive match
        $lowercaseKey = strtolower($key);
        foreach ($properties as $k => $value) {
            if (strtolower($k) === $lowercaseKey) {
                return $value;
            }
        }
        
        return null;
    }
} 