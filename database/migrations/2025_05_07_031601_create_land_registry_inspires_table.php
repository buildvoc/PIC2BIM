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
        Schema::connection('pgsql')->create('land_registry_inspire', function (Blueprint $table) {
            $table->id();
            $table->string('gml_id')->nullable();
            $table->integer('INSPIREID')->nullable();
            $table->integer('LABEL')->nullable();
            $table->integer('NATIONALCADASTRALREFERENCE')->nullable();
            $table->timestamp('VALIDFROM')->nullable();
            $table->timestamp('BEGINLIFESPANVERSION')->nullable();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE land_registry_inspire ADD COLUMN geom geometry(MultiPolygon,4326) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('pgsql')->dropIfExists('land_registry_inspire');
    }
};
