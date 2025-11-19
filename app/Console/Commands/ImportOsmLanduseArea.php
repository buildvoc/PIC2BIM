<?php

namespace App\Console\Commands;

use App\Models\OsmLanduseArea;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ImportOsmLanduseArea extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-osm-landuse-area {path?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import OSM landuse area data from GeoJSON file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('path') ?? public_path('osm_landuse_all_tags.visible.geojson');

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return 1;
        }

        $this->info("Importing OSM landuse areas from: {$filePath}");

        try {
            $content = file_get_contents($filePath);
            $geoJson = json_decode($content, true);

            if (!$geoJson || !isset($geoJson['features'])) {
                $this->error('Invalid GeoJSON format');
                return 1;
            }

            $features = $geoJson['features'];
            $totalFeatures = count($features);
            $this->info("Found {$totalFeatures} features to import");

            $chunkSize = 100;
            $chunks = array_chunk($features, $chunkSize);
            $totalChunks = count($chunks);
            $imported = 0;
            $skipped = 0;
            $errors = 0;

            $progressBar = $this->output->createProgressBar($totalChunks);
            $progressBar->start();

            foreach ($chunks as $chunkIndex => $chunk) {
                DB::transaction(function () use ($chunk, &$imported, &$skipped, &$errors) {
                    foreach ($chunk as $feature) {
                        try {
                            $result = $this->processFeature($feature);
                            if ($result === 'imported') {
                                $imported++;
                            } elseif ($result === 'skipped') {
                                $skipped++;
                            }
                        } catch (\Exception $e) {
                            $errors++;
                            Log::error('Error processing OSM landuse area feature', [
                                'error' => $e->getMessage(),
                                'feature' => $feature
                            ]);
                        }
                    }
                });

                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine();

            $this->info("Import completed!");
            $this->info("Imported: {$imported}");
            $this->info("Skipped: {$skipped}");
            $this->info("Errors: {$errors}");

            return 0;

        } catch (\Exception $e) {
            $this->error("Error importing data: " . $e->getMessage());
            Log::error('OSM landuse area import error', ['error' => $e->getMessage()]);
            return 1;
        }
    }

    /**
     * Process a single GeoJSON feature
     */
    private function processFeature(array $feature): string
    {
        if (!isset($feature['geometry']) || !isset($feature['properties'])) {
            return 'skipped';
        }

        $geometry = $feature['geometry'];
        $properties = $feature['properties'];

        // Skip if no geometry or not a Polygon
        if (!$geometry || $geometry['type'] !== 'Polygon') {
            return 'skipped';
        }

        // Extract OSM ID for duplicate checking
        $osmId = $this->extractValue($properties, ['osm_id']);

        // Extract landuse type, provide default if empty
        $landuse = $this->extractLanduseType($properties);
        if (empty($landuse)) {
            $landuse = 'unknown'; // Default value for empty landuse
        }

        // Check for duplicates by OSM ID
        if (!empty($osmId) && is_numeric($osmId)) {
            if (OsmLanduseArea::where('osm_id', $osmId)->exists()) {
                return 'skipped';
            }
        }

        // Prepare tags JSON from all properties
        $tags = $this->prepareTags($properties);

        // Prepare data for insertion
        $landuseData = [
            'source' => $this->extractValue($properties, ['source']) ?: 'osm',
            'osm_id' => !empty($osmId) && is_numeric($osmId) ? (int)$osmId : null,
            'name' => $this->extractValue($properties, ['name']),
            'landuse' => $landuse,
            'operator' => $this->extractValue($properties, ['operator']),
            'ref' => $this->extractValue($properties, ['ref']),
            'start_date' => $this->parseDate($this->extractValue($properties, ['start_date'])),
            'opening_date' => $this->parseDate($this->extractValue($properties, ['opening_date'])),
            'end_date' => $this->parseDate($this->extractValue($properties, ['end_date'])),
            'tags' => $tags,
        ];

        // Create geometry using PostGIS (convert from WGS84 to BNG)
        $geometryJson = json_encode($geometry);
        $bngGeometry = DB::selectOne(
            "SELECT ST_Transform(ST_GeomFromGeoJSON(?), 27700) as geom",
            [$geometryJson]
        )->geom;

        $landuseData['geom'] = $bngGeometry;

        // Create the landuse area record
        OsmLanduseArea::create($landuseData);

        return 'imported';
    }

    /**
     * Extract landuse type from properties
     */
    private function extractLanduseType(array $properties): ?string
    {
        // First check the main landuse field
        $landuse = $this->extractValue($properties, ['landuse']);
        if (!empty($landuse)) {
            return $landuse;
        }

        // Check for specific landuse types in properties
        $landuseTypes = [
            'residential', 'commercial', 'industrial', 'retail', 
            'farmland', 'forest', 'grass', 'meadow', 'construction',
            'crop', 'trees', 'wood'
        ];

        foreach ($landuseTypes as $type) {
            $value = $this->extractValue($properties, [$type]);
            if (!empty($value)) {
                return $type;
            }
        }

        return null;
    }

    /**
     * Prepare tags JSON from properties
     */
    private function prepareTags(array $properties): array
    {
        $tags = [];
        
        // Skip standard fields that have their own columns
        $skipFields = [
            'name', 'source', 'osm_id', 'landuse', 'operator', 'ref',
            'start_date', 'opening_date', 'end_date'
        ];

        foreach ($properties as $key => $value) {
            if (in_array($key, $skipFields)) {
                continue;
            }

            // Only include non-empty values
            if (!empty(trim($value))) {
                $tags[$key] = trim($value);
            }
        }

        return $tags;
    }

    /**
     * Parse date string to Carbon instance
     */
    private function parseDate(?string $dateString): ?Carbon
    {
        if (empty($dateString)) {
            return null;
        }

        try {
            // Try various date formats
            $formats = ['Y-m-d', 'Y-m-d H:i:s', 'Y/m/d', 'd/m/Y', 'd-m-Y'];
            
            foreach ($formats as $format) {
                try {
                    return Carbon::createFromFormat($format, $dateString);
                } catch (\Exception $e) {
                    continue;
                }
            }

            // Try parsing as a general date
            return Carbon::parse($dateString);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Extract value from properties, trying multiple possible keys
     */
    private function extractValue(array $properties, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (isset($properties[$key]) && !empty(trim($properties[$key]))) {
                return trim($properties[$key]);
            }
        }
        return null;
    }
}
