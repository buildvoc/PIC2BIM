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
        Schema::create('lus_fts_site', function (Blueprint $table) {
            $table->uuid('osid')->primary();
            $table->string('toid', 20)->nullable();
            $table->date('versiondate');
            $table->timestamp('versionavailablefromdate');
            $table->timestamp('versionavailabletodate')->nullable();
            $table->string('changetype', 50);
            $table->decimal('geometry_area_m2', 15, 3);
            $table->date('geometry_evidencedate')->nullable();
            $table->date('geometry_updatedate');
            $table->string('geometry_capturemethod', 25);
            $table->string('theme', 40);
            $table->string('description', 50);
            $table->date('description_evidencedate')->nullable();
            $table->date('description_updatedate');
            $table->string('description_capturemethod', 25);
            $table->string('oslandusetiera', 50);
            $table->string('oslandusetierb', 166)->nullable();
            $table->date('oslanduse_evidencedate')->nullable();
            $table->date('oslanduse_updatedate');
            $table->string('oslanduse_capturemethod', 25);
            $table->string('stakeholder', 150)->nullable();
            $table->string('name1_text', 254)->nullable();
            $table->string('name1_language', 3)->nullable();
            $table->date('name1_evidencedate')->nullable();
            $table->date('name1_updatedate')->nullable();
            $table->string('name2_text', 254)->nullable();
            $table->string('name2_language', 3)->nullable();
            $table->date('name2_evidencedate')->nullable();
            $table->date('name2_updatedate')->nullable();
            $table->string('extentdefinition', 30);
            $table->bigInteger('matcheduprn')->nullable();
            $table->string('matcheduprn_method', 40)->nullable();
            $table->string('address_classificationcode', 2)->nullable();
            $table->string('address_primarydescription', 120)->nullable();
            $table->string('address_secondarydescription', 120)->nullable();
            $table->string('address_classificationcorrelation', 15)->nullable();
            $table->string('address_classificationsource', 20)->nullable();
            $table->integer('addresscount_total');
            $table->integer('addresscount_residential');
            $table->integer('addresscount_commercial');
            $table->integer('addresscount_other');
            $table->string('nlud_code', 4)->nullable();
            $table->string('nlud_orderdescription', 30)->nullable();
            $table->string('nlud_groupdescription', 40)->nullable();
            $table->uuid('mainbuildingid')->nullable();
            $table->string('status', 20)->nullable();
            $table->date('status_updatedate')->nullable();
        });

        DB::statement('ALTER TABLE lus_fts_site ADD COLUMN geometry geometry(MultiPolygon, 27700)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lus_fts_site');
    }
};
