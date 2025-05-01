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
        Schema::connection('pgsql')->create('osopenuprn_address', function (Blueprint $table) {
            $table->integer('fid')->autoIncrement()->primary();
            $table->bigInteger('uprn');
            $table->double('x_coordinate');
            $table->double('y_coordinate');
            $table->double('latitude');
            $table->double('longitude');
            $table->timestamps();
        });
        
        DB::connection('pgsql')->statement('CREATE EXTENSION IF NOT EXISTS postgis');
        
        DB::connection('pgsql')->statement('ALTER TABLE osopenuprn_address ADD COLUMN IF NOT EXISTS geom geometry(Point, 27700)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('pgsql')->dropIfExists('osopenuprn_address');
    }
};
