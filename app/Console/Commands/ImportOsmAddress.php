<?php

namespace App\Console\Commands;

use App\Models\OsmAddress;
use App\Models\OsmBuildingPart;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ImportOsmAddress extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-osm-address {path?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import OSM address data from GeoJSON file';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('path') ?? public_path('osm_addresses_all_tags.geojson');

        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return 1;
        }

        $this->info("Importing OSM addresses from: {$filePath}");

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
                            Log::error('Error processing OSM address feature', [
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
            Log::error('OSM address import error', ['error' => $e->getMessage()]);
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

        // Skip if no geometry or not a Point
        if (!$geometry || $geometry['type'] !== 'Point') {
            return 'skipped';
        }

        // Extract coordinates
        $coordinates = $geometry['coordinates'];
        if (count($coordinates) < 2) {
            return 'skipped';
        }

        $longitude = $coordinates[0];
        $latitude = $coordinates[1];

        // Skip if coordinates are invalid
        if (!is_numeric($longitude) || !is_numeric($latitude)) {
            return 'skipped';
        }

        // Extract OSM ID and UPRN for duplicate checking
        $osmId = $this->extractValue($properties, ['osm_id']);
        $uprn = $this->extractValue($properties, ['uprn']);

        // Allow records with valid coordinates even if they don't have OSM ID, UPRN, or address data
        // This handles placeholder/centroid records that might be populated later

        // Check for duplicates
        $existingQuery = OsmAddress::query();
        if (!empty($osmId)) {
            $existingQuery->where('osm_id', $osmId);
        } elseif (!empty($uprn)) {
            $existingQuery->where('uprn', $uprn);
        }

        if ($existingQuery->exists()) {
            return 'skipped';
        }

        // Find building part ID if provided
        $buildingPartId = $this->extractValue($properties, ['building_part_id']);
        if (!empty($buildingPartId) && is_numeric($buildingPartId)) {
            // Verify building part exists
            if (!OsmBuildingPart::where('id', $buildingPartId)->exists()) {
                $buildingPartId = null;
            }
        } else {
            $buildingPartId = null;
        }

        // Prepare data for insertion
        $addressData = [
            'building_part_id' => $buildingPartId,
            'osm_id' => !empty($osmId) && is_numeric($osmId) ? (int)$osmId : null,
            'uprn' => $this->extractValue($properties, ['uprn']),
            'source' => $this->extractValue($properties, ['source']) ?: 'osm',
            'housenumber' => $this->extractValue($properties, ['housenumber', 'addr:housenumber']),
            'unit' => $this->extractValue($properties, ['unit', 'addr:unit']),
            'street' => $this->extractValue($properties, ['street', 'addr:street']),
            'suburb' => $this->extractValue($properties, ['suburb', 'addr:suburb']),
            'city' => $this->extractValue($properties, ['city', 'addr:city']),
            'postcode' => $this->extractValue($properties, ['postcode', 'addr:postcode']),
            'county' => $this->extractValue($properties, ['county', 'addr:county']),
            'state' => $this->extractValue($properties, ['state', 'addr:state']),
            'country' => $this->extractValue($properties, ['country', 'addr:country']),
            'country_code' => $this->extractValue($properties, ['country_code', 'addr:country_code']),
        ];

        // Create geometry using PostGIS
        $point = DB::selectOne(
            "SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326) as geom",
            [$longitude, $latitude]
        )->geom;

        $addressData['point_wgs84'] = $point;

        // Create the address record
        OsmAddress::create($addressData);

        return 'imported';
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

    /**
     * Check if properties contain minimal address data
     */
    private function hasMinimalAddressData(array $properties): bool
    {
        $addressFields = [
            ['housenumber', 'addr:housenumber'],
            ['street', 'addr:street'],
            ['postcode', 'addr:postcode'],
            ['city', 'addr:city'],
            ['suburb', 'addr:suburb']
        ];

        foreach ($addressFields as $fieldKeys) {
            $value = $this->extractValue($properties, $fieldKeys);
            if (!empty($value)) {
                return true;
            }
        }

        return false;
    }
}
