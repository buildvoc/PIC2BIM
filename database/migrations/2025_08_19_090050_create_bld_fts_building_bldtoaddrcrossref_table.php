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
        Schema::create('bld_fts_building_bldtoaddrcrossref', function (Blueprint $table) {
            $table->bigInteger('uprn');
            $table->uuid('buildingid');
            $table->date('buildingversiondate');

            $table->primary(['uprn', 'buildingid', 'buildingversiondate']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bld_fts_building_bldtoaddrcrossref');
    }
};
