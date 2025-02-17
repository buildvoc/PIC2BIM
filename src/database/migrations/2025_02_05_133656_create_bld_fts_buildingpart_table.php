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
        Schema::create('bld_fts_buildingpart', function (Blueprint $table) {
            $table->string('osid', 50)->nullable();
            $table->string('toid', 20)->nullable();
            $table->date('versiondate')->nullable();
            $table->timestamp('versionavailablefromdate')->nullable();
            $table->timestamp('versionavailabletodate')->nullable();
            $table->date('firstdigitalcapturedate')->nullable();
            $table->string('changetype', 50)->nullable();
            // Use correct SRID and geometry type
            $table->geometry('geometry', 'Polygon',27700);
            $table->decimal('geometry_area', 15, 6)->nullable();
            $table->date('geometry_evidencedate')->nullable();
            $table->date('geometry_updatedate')->nullable();
            $table->string('geometry_source', 50)->nullable();
            $table->string('theme', 40)->nullable();
            $table->string('description', 50)->nullable();
            $table->date('description_evidencedate')->nullable();
            $table->date('description_updatedate')->nullable();
            $table->string('description_source', 50)->nullable();
            $table->string('oslandcovertiera', 15)->nullable();
            $table->string('oslandcovertierb', 20)->nullable();
            $table->date('oslandcover_evidencedate')->nullable();
            $table->date('oslandcover_updatedate')->nullable();
            $table->string('oslandcover_source', 50)->nullable();
            $table->string('oslandusetiera', 50)->nullable();
            $table->string('oslandusetierb', 88)->nullable();
            $table->date('oslanduse_evidencedate')->nullable();
            $table->date('oslanduse_updatedate')->nullable();
            $table->string('oslanduse_source', 50)->nullable();
            $table->decimal('absoluteheightroofbase', 6, 2)->nullable();
            $table->decimal('relativeheightroofbase', 6, 2)->nullable();
            $table->decimal('absoluteheightmaximum', 6, 2)->nullable();
            $table->decimal('relativeheightmaximum', 6, 2)->nullable();
            $table->decimal('absoluteheightminimum', 6, 2)->nullable();
            $table->string('heightconfidencelevel', 15)->nullable();
            $table->date('height_evidencedate')->nullable();
            $table->date('height_updatedate')->nullable();
            $table->string('height_source', 50)->nullable();
            $table->string('associatedstructure', 25)->nullable();
            $table->boolean('isobscured')->nullable();
            $table->string('physicallevel', 15)->nullable();
            $table->string('capturespecification', 10)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bld_fts_buildingpart');
    }
};
