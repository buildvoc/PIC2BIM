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
        Schema::create('bld_fts_building_bldtobldprtcrossref', function (Blueprint $table) {
            $table->uuid('buildingpartid');
            $table->uuid('buildingid');
            $table->date('buildingversiondate');

            $table->primary(['buildingpartid', 'buildingid', 'buildingversiondate']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bld_fts_building_bldtobldprtcrossref');
    }
};
