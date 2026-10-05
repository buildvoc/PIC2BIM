<?php

namespace App\Console\Commands;

use App\Models\Attr\Building;
use App\Models\Attr\BuildingPartLink;
use App\Models\Attr\BuildingSiteLink;
use App\Models\Attr\BuildingAddress;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class ImportBuildingJson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-building-json';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import Buildings Json';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = public_path('building.json');
        $jsonData = json_decode(File::get($filePath), true);

        $total = count($jsonData['features']);
        $this->info('Total buildings found: ' . $total);
        $bar = $this->output->createProgressBar($total);

        $count = 0;
        foreach ($jsonData['features'] as $data) {
            $building = Building::updateOrCreate([
                'osid' => $data['id']
            ], [
                'versiondate' => $data['properties']['versiondate'] ?? null,
                'versionavailablefromdate' => $data['properties']['versionavailablefromdate'] ?? null,
                'versionavailabletodate' => $data['properties']['versionavailabletodate'] ?? null,
                'changetype' => $data['properties']['changetype'] ?? null,
                'geometry' => isset($data['geometry']) ? DB::raw("ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON('" . json_encode($data['geometry']) . "'), 4326), 27700)") : null,
                'geometry_area_m2' => $data['properties']['geometry_area_m2'] ?? null,
                'geometry_updatedate' => $data['properties']['geometry_updatedate'] ?? null,
                'theme' => $data['properties']['theme'] ?? null,
                'description' => $data['properties']['description'] ?? null,
                'description_updatedate' => $data['properties']['description_updatedate'] ?? null,
                'physicalstate' => $data['properties']['physicalstate'] ?? '',
                'physicalstate_updatedate' => date('Y-m-d'),
                'buildingpartcount' => $data['properties']['buildingpartcount'] ?? null,
                'isinsite' => $data['properties']['isinsite'] ?? null,
                'primarysiteid' => $data['properties']['primarysiteid'] ?? null,
                'containingsitecount' => $data['properties']['containingsitecount'] ?? null,
                'mainbuildingid' => $data['properties']['mainbuildingid'] ?? null,
                'mainbuildingid_ismainbuilding' => $data['properties']['mainbuildingid_ismainbuilding'] ?? null,
                'mainbuildingid_updatedate' => $data['properties']['mainbuildingid_updatedate'] ?? null,
                'buildinguse' => $data['properties']['buildinguse'] ?? null,
                'buildinguse_oslandusetiera' => $data['properties']['buildinguse_oslandusetiera'] ?? null,
                'buildinguse_addresscount_total' => $data['properties']['buildinguse_addresscount_total'] ?? null,
                'buildinguse_addresscount_residential' => $data['properties']['buildinguse_addresscount_residential'] ?? null,
                'buildinguse_addresscount_commercial' => $data['properties']['buildinguse_addresscount_commercial'] ?? null,
                'buildinguse_addresscount_other' => $data['properties']['buildinguse_addresscount_other'] ?? null,
                'buildinguse_updatedate' => $data['properties']['buildinguse_updatedate'] ?? null,
                'connectivity' => $data['properties']['connectivity'] ?? null,
                'connectivity_count' => $data['properties']['connectivity_count'] ?? null,
                'connectivity_updatedate' => $data['properties']['connectivity_updatedate'] ?? null,
                'constructionmaterial' => $data['properties']['constructionmaterial'] ?? null,
                'constructionmaterial_evidencedate' => $data['properties']['constructionmaterial_evidencedate'] ?? null,
                'constructionmaterial_updatedate' => $data['properties']['constructionmaterial_updatedate'] ?? null,
                'constructionmaterial_source' => $data['properties']['constructionmaterial_source'] ?? null,
                'constructionmaterial_capturemethod' => $data['properties']['constructionmaterial_capturemethod'] ?? null,
                'constructionmaterial_thirdpartyprovenance' => $data['properties']['constructionmaterial_thirdpartyprovenance'] ?? null,
                'buildingage_period' => $data['properties']['buildingage_period'] ?? null,
                'buildingage_year' => $data['properties']['buildingage_year'] ?? null,
                'buildingage_evidencedate' => $data['properties']['buildingage_evidencedate'] ?? null,
                'buildingage_updatedate' => $data['properties']['buildingage_updatedate'] ?? null,
                'buildingage_source' => $data['properties']['buildingage_source'] ?? null,
                'buildingage_capturemethod' => $data['properties']['buildingage_capturemethod'] ?? null,
                'buildingage_thirdpartyprovenance' => $data['properties']['buildingage_thirdpartyprovenance'] ?? null,
                'basementpresence' => $data['properties']['basementpresence'] ?? null,
                'basementpresence_selfcontained' => $data['properties']['basementpresence_selfcontained'] ?? null,
                'basementpresence_evidencedate' => $data['properties']['basementpresence_evidencedate'] ?? null,
                'basementpresence_updatedate' => $data['properties']['basementpresence_updatedate'] ?? null,
                'basementpresence_source' => $data['properties']['basementpresence_source'] ?? null,
                'basementpresence_capturemethod' => $data['properties']['basementpresence_capturemethod'] ?? null,
                'basementpresence_thirdpartyprovenance' => $data['properties']['basementpresence_thirdpartyprovenance'] ?? null,
                'numberoffloors' => $data['properties']['numberoffloors'] ?? null,
                'numberoffloors_evidencedate' => $data['properties']['numberoffloors_evidencedate'] ?? null,
                'numberoffloors_updatedate' => $data['properties']['numberoffloors_updatedate'] ?? null,
                'numberoffloors_source' => $data['properties']['numberoffloors_source'] ?? null,
                'numberoffloors_capturemethod' => $data['properties']['numberoffloors_capturemethod'] ?? null,
                // Height fields
                'height_absolutemin_m' => $data['properties']['height_absolutemin_m'] ?? null,
                'height_absoluteroofbase_m' => $data['properties']['height_absoluteroofbase_m'] ?? null,
                'height_absolutemax_m' => $data['properties']['height_absolutemax_m'] ?? null,
                'height_relativeroofbase_m' => $data['properties']['height_relativeroofbase_m'] ?? null,
                'height_relativemax_m' => $data['properties']['height_relativemax_m'] ?? null,
                'height_confidencelevel' => $data['properties']['height_confidencelevel'] ?? null,
                'height_evidencedate' => $data['properties']['height_evidencedate'] ?? null,
                'height_updatedate' => $data['properties']['height_updatedate'] ?? null,
                // Roof material fields
                'roofmaterial_primarymaterial' => $data['properties']['roofmaterial_primarymaterial'] ?? null,
                'roofmaterial_solarpanelpresence' => $data['properties']['roofmaterial_solarpanelpresence'] ?? null,
                'roofmaterial_greenroofpresence' => $data['properties']['roofmaterial_greenroofpresence'] ?? null,
                'roofmaterial_confidenceindicator' => $data['properties']['roofmaterial_confidenceindicator'] ?? null,
                'roofmaterial_evidencedate' => $data['properties']['roofmaterial_evidencedate'] ?? null,
                'roofmaterial_updatedate' => $data['properties']['roofmaterial_updatedate'] ?? null,
                'roofmaterial_capturemethod' => $data['properties']['roofmaterial_capturemethod'] ?? null,
                // Roof shape aspect fields
                'roofshapeaspect_shape' => $data['properties']['roofshapeaspect_shape'] ?? null,
                'roofshapeaspect_areapitched_m2' => $data['properties']['roofshapeaspect_areapitched_m2'] ?? null,
                'roofshapeaspect_areaflat_m2' => $data['properties']['roofshapeaspect_areaflat_m2'] ?? null,
                'roofshapeaspect_areafacingnorth_m2' => $data['properties']['roofshapeaspect_areafacingnorth_m2'] ?? null,
                'roofshapeaspect_areafacingnortheast_m2' => $data['properties']['roofshapeaspect_areafacingnortheast_m2'] ?? null,
                'roofshapeaspect_areafacingeast_m2' => $data['properties']['roofshapeaspect_areafacingeast_m2'] ?? null,
                'roofshapeaspect_areafacingsoutheast_m2' => $data['properties']['roofshapeaspect_areafacingsoutheast_m2'] ?? null,
                'roofshapeaspect_areafacingsouth_m2' => $data['properties']['roofshapeaspect_areafacingsouth_m2'] ?? null,
                'roofshapeaspect_areafacingsouthwest_m2' => $data['properties']['roofshapeaspect_areafacingsouthwest_m2'] ?? null,
                'roofshapeaspect_areafacingwest_m2' => $data['properties']['roofshapeaspect_areafacingwest_m2'] ?? null,
                'roofshapeaspect_areafacingnorthwest_m2' => $data['properties']['roofshapeaspect_areafacingnorthwest_m2'] ?? null,
                'roofshapeaspect_areaindeterminable_m2' => $data['properties']['roofshapeaspect_areaindeterminable_m2'] ?? null,
                'roofshapeaspect_areatotal_m2' => $data['properties']['roofshapeaspect_areatotal_m2'] ?? null,
                'roofshapeaspect_confidenceindicator' => $data['properties']['roofshapeaspect_confidenceindicator'] ?? null,
                'roofshapeaspect_evidencedate' => $data['properties']['roofshapeaspect_evidencedate'] ?? null,
                'roofshapeaspect_updatedate' => $data['properties']['roofshapeaspect_updatedate'] ?? null,
                'roofshapeaspect_capturemethod' => $data['properties']['roofshapeaspect_capturemethod'] ?? null,
            ]);

            // Handle buildingpartreference
            if (!empty($data['properties']['buildingpartreference']) && is_array($data['properties']['buildingpartreference'])) {
                foreach ($data['properties']['buildingpartreference'] as $partRef) {
                    BuildingPartLink::updateOrCreate([
                        'buildingid' => $partRef['buildingid'],
                        'buildingpartid' => $partRef['buildingpartid'],
                        'buildingversiondate' => $partRef['buildingversiondate'],
                    ], []);
                }
            }

            // Handle sitereference
            if (!empty($data['properties']['sitereference']) && is_array($data['properties']['sitereference'])) {
                foreach ($data['properties']['sitereference'] as $siteRef) {
                    BuildingSiteLink::updateOrCreate([
                        'buildingid' => $siteRef['buildingid'],
                        'siteid' => $siteRef['siteid'],
                        'buildingversiondate' => $siteRef['buildingversiondate'],
                    ], []);
                }
            }

            // Handle uprnreference
            if (!empty($data['properties']['uprnreference']) && is_array($data['properties']['uprnreference'])) {
                foreach ($data['properties']['uprnreference'] as $uprnRef) {
                    BuildingAddress::updateOrCreate([
                        'uprn' => $uprnRef['uprn'],
                        'buildingid' => $uprnRef['buildingid'],
                        'buildingversiondate' => $uprnRef['buildingversiondate'],
                    ], []);
                }
            }
            $count++;
            $bar->advance();
        }
        $bar->finish();
        $this->newLine(2);
        $this->info('Building import completed!');
        $this->info("Total buildings processed: $count");
    }
}

