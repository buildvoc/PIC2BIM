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
        Schema::create('ons_bua', function (Blueprint $table) {
            $table->id('fid');
            $table->bigInteger('objectid_1');
            $table->string('gsscode');
            $table->string('bua24cd');
            $table->string('bua24nm');
            $table->string('bua24nmw')->nullable();
            $table->double('geometry_a');
            $table->double('areahectar');
            $table->uuid('globalid');
        });

        DB::statement('ALTER TABLE ons_bua ADD COLUMN geometry geometry(MultiPolygon, 27700)');
        Schema::table('ons_bua', function (Blueprint $table) {
            $table->spatialIndex('geometry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ons_bua');
    }
};
