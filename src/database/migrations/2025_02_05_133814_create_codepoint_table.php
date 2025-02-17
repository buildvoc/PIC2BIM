<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('codepoint', function (Blueprint $table) {
            $table->integer('ogc_fid')->primary()->autoIncrement();
            $table->string('postcode')->nullable();
            $table->integer('positional_quality_indicator')->nullable();
            $table->string('country_code')->nullable();
            $table->string('nhs_regional_ha_code')->nullable();
            $table->string('nhs_ha_code')->nullable();
            $table->string('admin_county_code')->nullable();
            $table->string('admin_district_code')->nullable();
            $table->string('admin_ward_code')->nullable();

            // Geometry column for PostGIS support
            $table->geometry('geometry', 'Polygon',27700);

            // Indexes
            $table->index('geometry', 'geometry_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('codepoint');
    }
};
