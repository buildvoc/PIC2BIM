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
        Schema::create('land', function (Blueprint $table) {
            $table->id();
            $table->string('identificator', 45)->nullable();
            $table->text('pa_description');
            $table->text('wkt');
            $table->geometry('wgs_geometry', 'MultiPolygon', 4326);
            $table->float('wgs_max_lat')->nullable();
            $table->float('wgs_min_lat')->nullable();
            $table->float('wgs_max_lng')->nullable();
            $table->float('wgs_min_lng')->nullable();
            $table->index(['wgs_max_lat','wgs_min_lat','wgs_max_lng','wgs_min_lng'], 'idx_minmax');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('land');
    }
};
