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
        Schema::create('land_registry_cadastral', function (Blueprint $table) {
            $table->increments('id'); // SERIAL PRIMARY KEY (INT AUTO INCREMENT)
            $table->integer('fid')->nullable(false)->index();
            $table->string('county_code', 10)->nullable(false)->index();
            $table->string('county_name', 100)->nullable(false)->index();
            $table->integer('bng_easting')->nullable();
            $table->integer('bng_northing')->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->uuid('global_id')->unique()->nullable();

            // timestamps dengan default CURRENT_TIMESTAMP
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });

        // Tambah geometry columns (cara modern)
        DB::statement("ALTER TABLE land_registry_cadastral ADD COLUMN geometry geometry(MULTIPOLYGON, 4326)");
        DB::statement("ALTER TABLE land_registry_cadastral ADD COLUMN geometry_bng geometry(MULTIPOLYGON, 27700)");

        // Tambah spatial indexes
        DB::statement("CREATE INDEX idx_land_registry_cadastral_geom ON land_registry_cadastral USING GIST (geometry)");
        DB::statement("CREATE INDEX idx_land_registry_cadastral_geom_bng ON land_registry_cadastral USING GIST (geometry_bng)");

        // Index tambahan untuk koordinat
        Schema::table('land_registry_cadastral', function (Blueprint $table) {
            $table->index(['bng_easting', 'bng_northing'], 'idx_land_registry_bng_coords');
            $table->index(['longitude', 'latitude'], 'idx_land_registry_coords');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('land_registry_cadastral');
    }
};
