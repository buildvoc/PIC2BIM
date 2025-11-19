<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\OsmBuildingPart;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ImportOsmBuildingPart extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-osm-building-part {path?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import OSM building part data from GeoJSON file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $path = $this->argument('path') ?? 'public/osm_buildings_all_tags.geojson';
        
        if (!file_exists($path)) {
            $this->error("File not found: {$path}");
            return 1;
        }

        $this->info("Starting import from: {$path}");

        try {
            $geojsonContent = file_get_contents($path);
            $geojson = json_decode($geojsonContent, true);

            if (!$geojson || !isset($geojson['features'])) {
                $this->error('Invalid GeoJSON format');
                return 1;
            }

            $features = $geojson['features'];
            $totalFeatures = count($features);
            $this->info("Found {$totalFeatures} features to import");

            $chunkSize = 100;
            $chunks = array_chunk($features, $chunkSize);
            $imported = 0;
            $skipped = 0;
            $errors = 0;

            $progressBar = $this->output->createProgressBar($totalFeatures);
            $progressBar->start();

            foreach ($chunks as $chunk) {
                DB::beginTransaction();
                
                try {
                    foreach ($chunk as $feature) {
                        try {
                            $this->importFeature($feature);
                            $imported++;
                        } catch (\Exception $e) {
                            $this->error("\nError importing feature: " . $e->getMessage());
                            $errors++;
                        }
                        $progressBar->advance();
                    }
                    
                    DB::commit();
                } catch (\Exception $e) {
                    DB::rollback();
                    $this->error("\nTransaction failed: " . $e->getMessage());
                    $errors += count($chunk);
                }
            }

            $progressBar->finish();
            $this->newLine();

            $this->info("Import completed!");
            $this->info("Imported: {$imported}");
            $this->info("Errors: {$errors}");
            $this->info("Total processed: " . ($imported + $errors));

            return 0;

        } catch (\Exception $e) {
            $this->error("Import failed: " . $e->getMessage());
            return 1;
        }
    }

    /**
     * Import a single GeoJSON feature
     */
    private function importFeature($feature)
    {
        if (!isset($feature['geometry']) || !isset($feature['properties'])) {
            throw new \Exception('Invalid feature format');
        }

        $geometry = $feature['geometry'];
        $properties = $feature['properties'];

        // Encode geometry JSON dan escape tanda kutip
        $geometryJson = json_encode($geometry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        // Siapkan data untuk kolom non-geometry
        $data = [
            'source' => 'OSM',
            'osm_id' => $this->parseNumeric($properties['osm_id'] ?? null),
            'name' => $this->parseText($properties['name'] ?? null),

            // UPRN
            'ref_gb_uprn' => $this->parseText(
                $properties['ref:GB:uprn'] ?? $properties['ref_gb_uprn'] ?? null
            ),

            // Base properties (sesuai ENUM di schema)
            'base_shape' => $this->parseEnum(
                $properties['base_shape'] ?? null,
                ['flat','slope','pyramidal','inverted_pyramidal','dome','inverted_dome',
                'round','inverted_round','gabled','gambrel','segmental_arch',
                'inverted_segmental_arch','partial_arch']
            ),
            'base_direction' => $this->parseNumeric($properties['base_direction'] ?? null),
            'base_orientation' => $this->parseEnum(
                $properties['base_orientation'] ?? null,
                ['along','across']
            ),
            'base_height_m' => $this->parseNumeric($properties['base_height_m'] ?? null),
            'base_levels' => $this->parseInteger($properties['base_levels'] ?? null),
            'base_colour' => $this->parseText($properties['base_colour'] ?? null),
            'base_material' => $this->parseText($properties['base_material'] ?? $properties['building:material'] ?? null),
            'base_angle_deg' => $this->parseNumeric($properties['base_angle_deg'] ?? null),

            // Building
            'building' => $this->parseText($properties['building'] ?? null),
            'building_part' => $this->parseText($properties['building:part'] ?? $properties['building_part'] ?? null),
            'building_levels' => $this->parseInteger($properties['building_levels'] ?? $properties['building:levels'] ?? null),
            'building_min_level' => $this->parseInteger($properties['building_min_level'] ?? null),
            'building_levels_underground' => $this->parseInteger($properties['building_levels_underground'] ?? $properties['building:levels:underground'] ?? null),

            // Roof
            'roof_levels' => $this->parseInteger($properties['roof_levels'] ?? $properties['roof:levels'] ?? null),
            'roof_shape' => $this->parseText($properties['roof_shape'] ?? $properties['roof:shape'] ?? null),

            // Height
            'height_m' => $this->parseNumeric($properties['height_m'] ?? $properties['height'] ?? null),
            'min_height_m' => $this->parseNumeric($properties['min_height_m'] ?? null),
            'roof_height_m' => $this->parseNumeric($properties['roof_height_m'] ?? $properties['roof:height'] ?? null),

            // Levels
            'levels' => $this->parseInteger($properties['levels'] ?? null),
            'min_level' => $this->parseInteger($properties['min_level'] ?? null),

            // Additional
            'building_reference_number' => $this->parseText($properties['building_reference_number'] ?? null),
            'tenure' => $this->parseText($properties['tenure'] ?? null),
            'construction_age_band' => $this->parseText($properties['construction_age_band'] ?? null),
            'transaction_type' => $this->parseText($properties['transaction_type'] ?? null),
        ];

        // Insert pakai statement binding agar GeoJSON tidak error
        $sql = "
            INSERT INTO osm_building_part (
                source, osm_id, name, ref_gb_uprn,
                base_shape, base_direction, base_orientation, base_height_m,
                base_levels, base_colour, base_material, base_angle_deg,
                building, building_part, building_levels, building_min_level,
                building_levels_underground, roof_levels, roof_shape,
                height_m, min_height_m, roof_height_m, levels, min_level,
                building_reference_number, tenure, construction_age_band, transaction_type,
                geom
            )
            VALUES (
                :source, :osm_id, :name, :ref_gb_uprn,
                :base_shape, :base_direction, :base_orientation, :base_height_m,
                :base_levels, :base_colour, :base_material, :base_angle_deg,
                :building, :building_part, :building_levels, :building_min_level,
                :building_levels_underground, :roof_levels, :roof_shape,
                :height_m, :min_height_m, :roof_height_m, :levels, :min_level,
                :building_reference_number, :tenure, :construction_age_band, :transaction_type,
                ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326), 27700)
            )
        ";

        DB::statement($sql, array_merge($data, ['geometry' => $geometryJson]));
    }

    /**
     * Parse text value, return null if empty
     */
    private function parseText($value)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }
        return trim($value);
    }

    /**
     * Parse numeric value, return null if not numeric
     */
    private function parseNumeric($value)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }
        
        if (is_numeric($value)) {
            return (float) $value;
        }
        
        return null;
    }

    /**
     * Parse integer value, return null if not integer
     */
    private function parseInteger($value)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }
        
        if (is_numeric($value)) {
            return (int) $value;
        }
        
        return null;
    }

    /**
     * Parse enum value, return null if not in allowed values
     */
    private function parseEnum($value, $allowedValues)
    {
        if (is_null($value) || $value === '' || $value === 'null') {
            return null;
        }
        
        $value = strtolower(trim($value));
        
        if (in_array($value, $allowedValues)) {
            return $value;
        }
        
        return null;
    }
}
