<?php

namespace App\Console\Commands;

use App\Models\Attr\Shape;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class ImportWDGeojson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-wd-geojson {file? : The path to the GeoJSON file} {--truncate : Truncate the shape table before import} {--skip-existing : Skip existing records based on wd24cd} {--update-existing : Update existing records based on wd24cd}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import WD_MAY_2024_UK_BGC.geojson data into the shape table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('file') ?? 'public/WD_MAY_2024_UK_BGC.geojson';
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
                if ($this->confirm('Are you sure you want to truncate the shape table? This will delete all existing data.')) {
                    DB::connection('pgsql')->statement('TRUNCATE TABLE shape RESTART IDENTITY CASCADE');
                    $this->info('Shape table truncated.');
                } else {
                    $this->info('Truncate operation cancelled.');
                }
            }
            
            // Get existing wd24cd values if we need to skip or update existing records
            $existingWd24Cds = [];
            if ($skipExisting || $updateExisting) {
                $existingWd24Cds = DB::connection('pgsql')
                    ->table('shape')
                    ->whereNotNull('wd24cd')
                    ->pluck('ogc_fid', 'wd24cd')
                    ->toArray();
                
                $this->info("Found " . count($existingWd24Cds) . " existing wd24cd records");
            }
            
            // Get the max ogc_fid to start from
            $maxOgcFid = DB::connection('pgsql')->table('shape')->max('ogc_fid') ?? 0;
            $this->info("Starting with ogc_fid: " . ($maxOgcFid + 1));
            
            $bar = $this->output->createProgressBar(count($jsonData['features']));
            
            DB::connection('pgsql')->beginTransaction();
            
            try {
                $count = 0;
                $skipped = 0;
                $updated = 0;
                $globalIdCount = 0;
                $nullGlobalIds = 0;
                
                foreach ($jsonData['features'] as $index => $feature) {
                    $properties = $feature['properties'];
                    $geometry = $feature['geometry'];
                    
                    // Extract lat/long from properties
                    $lat = $properties['LAT'] ?? null;
                    $long = $properties['LONG'] ?? null;
                    $wd24cd = $properties['WD24CD'] ?? null;
                    
                    // Check for GlobalID field with proper case sensitivity
                    $globalId = null;
                    if (array_key_exists('GlobalID', $properties)) {
                        $globalId = $properties['GlobalID'];
                        $globalIdCount++;
                    } elseif (array_key_exists('GLOBALID', $properties)) {
                        $globalId = $properties['GLOBALID'];
                        $globalIdCount++;
                    } elseif (array_key_exists('globalid', $properties)) {
                        $globalId = $properties['globalid'];
                        $globalIdCount++;
                    } else {
                        $nullGlobalIds++;
                    }
                    
                    // Skip if no wd24cd
                    if (empty($wd24cd)) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }
                    
                    // Check if record already exists and handle according to options
                    if (array_key_exists($wd24cd, $existingWd24Cds)) {
                        if ($skipExisting) {
                            $skipped++;
                            $bar->advance();
                            continue;
                        } elseif ($updateExisting) {
                            // Update existing record
                            $ogcFid = $existingWd24Cds[$wd24cd];
                            $geomStr = json_encode($geometry);
                            
                            DB::connection('pgsql')->statement(
                                "UPDATE shape SET 
                                wd24nm = ?, 
                                wd24nmw = ?, 
                                bng_e = ?, 
                                bng_n = ?, 
                                lat = ?, 
                                long = ?, 
                                globalid = ?, 
                                wkb_geometry = ST_SetSRID(ST_GeomFromGeoJSON(?), 27700)
                                WHERE ogc_fid = ?",
                                [
                                    $properties['WD24NM'] ?? null,
                                    $properties['WD24NMW'] ?? null,
                                    $properties['BNG_E'] ?? null,
                                    $properties['BNG_N'] ?? null,
                                    $lat,
                                    $long,
                                    $globalId,
                                    $geomStr,
                                    $ogcFid
                                ]
                            );
                            
                            $updated++;
                            $bar->advance();
                            continue;
                        }
                    }
                    
                    // Insert new record
                    $ogcFid = $maxOgcFid + $index + 1;
                    $geomStr = json_encode($geometry);
                    
                    DB::connection('pgsql')->statement(
                        "INSERT INTO shape (ogc_fid, wd24cd, wd24nm, wd24nmw, bng_e, bng_n, lat, long, globalid, wkb_geometry) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 27700))",
                        [
                            $ogcFid,
                            $wd24cd,
                            $properties['WD24NM'] ?? null,
                            $properties['WD24NMW'] ?? null,
                            $properties['BNG_E'] ?? null,
                            $properties['BNG_N'] ?? null,
                            $lat,
                            $long,
                            $globalId,
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
                $this->info("GlobalID statistics: $globalIdCount records with GlobalID, $nullGlobalIds without GlobalID");
                
                DB::connection('pgsql')->statement("SELECT setval('shape_ogc_fid_seq', (SELECT MAX(ogc_fid) FROM shape))");
                $this->info('Sequence updated.');
                
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
} 