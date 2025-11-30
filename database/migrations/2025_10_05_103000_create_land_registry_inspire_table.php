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
        Schema::create('land_registry_inspire', function (Blueprint $table) {
            $table->id();
            $table->string('gml_id')->unique()->index();
            $table->bigInteger('INSPIREID')->nullable()->index();
            $table->bigInteger('LABEL')->nullable();
            $table->bigInteger('NATIONALCADASTRALREFERENCE')->nullable();
            $table->timestamp('VALIDFROM')->nullable()->index();
            $table->timestamp('BEGINLIFESPANVERSION')->nullable();
            $table->timestamps();
        });

        // Add PostGIS geometry column for WGS84 coordinates (EPSG:4326)
        DB::statement('ALTER TABLE land_registry_inspire ADD COLUMN geom geometry(GEOMETRY, 4326)');

        // Create spatial index for geometry column
        DB::statement('CREATE INDEX land_registry_inspire_geom_idx ON land_registry_inspire USING GIST (geom)');

        // Create additional indexes for performance
        // DB::statement('CREATE INDEX land_registry_inspire_inspireid_idx ON land_registry_inspire (INSPIREID)');
        // DB::statement('CREATE INDEX land_registry_inspire_validfrom_idx ON land_registry_inspire (VALIDFROM)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('land_registry_inspire');
    }
};
