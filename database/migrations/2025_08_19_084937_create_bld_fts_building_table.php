<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis;');
        Schema::create('bld_fts_building', function (Blueprint $table) {
            $table->uuid('osid')->primary();
            $table->date('versiondate');
            $table->timestamp('versionavailablefromdate');
            $table->timestamp('versionavailabletodate')->nullable();
            $table->string('changetype', 50);
            $table->decimal('geometry_area_m2', 15, 3);
            $table->date('geometry_updatedate');
            $table->string('theme', 40);
            $table->string('description', 45);
            $table->date('description_updatedate');
            $table->string('physicalstate', 20);
            $table->date('physicalstate_updatedate');
            $table->integer('buildingpartcount');
            $table->boolean('isinsite');
            $table->uuid('primarysiteid')->nullable();
            $table->integer('containingsitecount');
            $table->uuid('mainbuildingid')->nullable();
            $table->string('mainbuildingid_ismainbuilding', 5)->nullable();
            $table->date('mainbuildingid_updatedate');
            $table->string('buildinguse', 100);
            $table->string('buildinguse_oslandusetiera', 50)->nullable();
            $table->integer('buildinguse_addresscount_total');
            $table->integer('buildinguse_addresscount_residential');
            $table->integer('buildinguse_addresscount_commercial');
            $table->integer('buildinguse_addresscount_other');
            $table->date('buildinguse_updatedate');
            $table->string('connectivity', 15);
            $table->integer('connectivity_count');
            $table->date('connectivity_updatedate');
            $table->string('constructionmaterial', 40)->nullable();
            $table->date('constructionmaterial_evidencedate')->nullable();
            $table->date('constructionmaterial_updatedate')->nullable();
            $table->string('constructionmaterial_source', 85)->nullable();
            $table->string('constructionmaterial_capturemethod', 25)->nullable();
            $table->string('constructionmaterial_thirdpartyprovenance', 65)->nullable();
            $table->string('buildingage_period', 10)->nullable();
            $table->integer('buildingage_year')->nullable();
            $table->date('buildingage_evidencedate')->nullable();
            $table->date('buildingage_updatedate')->nullable();
            $table->string('buildingage_source', 85)->nullable();
            $table->string('buildingage_capturemethod', 25)->nullable();
            $table->string('buildingage_thirdpartyprovenance', 65)->nullable();
            $table->string('basementpresence', 15)->nullable();
            $table->string('basementpresence_selfcontained', 15)->nullable();
            $table->date('basementpresence_evidencedate')->nullable();
            $table->date('basementpresence_updatedate')->nullable();
            $table->string('basementpresence_source', 85)->nullable();
            $table->string('basementpresence_capturemethod', 25)->nullable();
            $table->string('basementpresence_thirdpartyprovenance', 65)->nullable();
            $table->integer('numberoffloors')->nullable();
            $table->date('numberoffloors_evidencedate')->nullable();
            $table->date('numberoffloors_updatedate')->nullable();
            $table->string('numberoffloors_source', 40)->nullable();
            $table->string('numberoffloors_capturemethod', 25)->nullable();
            $table->decimal('height_absolutemin_m', 5, 1)->nullable();
            $table->decimal('height_absoluteroofbase_m', 5, 1)->nullable();
            $table->decimal('height_absolutemax_m', 5, 1)->nullable();
            $table->decimal('height_relativeroofbase_m', 4, 1)->nullable();
            $table->decimal('height_relativemax_m', 4, 1)->nullable();
            $table->string('height_confidencelevel', 15)->nullable();
            $table->date('height_evidencedate')->nullable();
            $table->date('height_updatedate')->nullable();
            $table->string('roofmaterial_primarymaterial', 35)->nullable();
            $table->string('roofmaterial_solarpanelpresence', 15)->nullable();
            $table->string('roofmaterial_greenroofpresence', 15)->nullable();
            $table->string('roofmaterial_confidenceindicator', 50)->nullable();
            $table->date('roofmaterial_evidencedate')->nullable();
            $table->date('roofmaterial_updatedate')->nullable();
            $table->string('roofmaterial_capturemethod', 25)->nullable();
            $table->string('roofshapeaspect_shape', 10)->nullable();
            $table->decimal('roofshapeaspect_areapitched_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areaflat_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingnorth_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingnortheast_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingeast_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingsoutheast_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingsouth_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingsouthwest_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingwest_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areafacingnorthwest_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areaindeterminable_m2', 7, 1)->nullable();
            $table->decimal('roofshapeaspect_areatotal_m2', 7, 1)->nullable();
            $table->string('roofshapeaspect_confidenceindicator', 50)->nullable();
            $table->date('roofshapeaspect_evidencedate')->nullable();
            $table->date('roofshapeaspect_updatedate')->nullable();
            $table->string('roofshapeaspect_capturemethod', 25)->nullable();
        });

        DB::statement('ALTER TABLE bld_fts_building ADD COLUMN geometry geometry(Polygon, 27700)');
        Schema::table('bld_fts_building', function (Blueprint $table) {
            $table->spatialIndex('geometry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bld_fts_building');
    }
};
