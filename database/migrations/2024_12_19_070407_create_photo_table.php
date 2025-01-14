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
        Schema::create('photo', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('user_id')->nullable();
            $table->bigInteger('task_id')->nullable()->index('idx_task_id');
            $table->text('note')->nullable();
            $table->float('lat', 10, 6)->nullable();
            $table->float('lng', 10, 6)->nullable();
            $table->float('centroidLat', 10, 6)->nullable();
            $table->float('centroidLng', 10, 6)->nullable();
            $table->float('altitude')->nullable();
            $table->dateTime('created')->nullable();
            $table->float('bearing')->nullable();
            $table->float('magnetic_azimuth')->nullable();
            $table->float('photo_heading')->nullable();
            $table->float('photo_angle')->nullable();
            $table->float('roll')->nullable();
            $table->float('pitch')->nullable();
            $table->integer('orientation')->nullable();

            $table->float('horizontal_view_angle')->nullable();
            $table->float('vertical_view_angle')->nullable();
            $table->float('accuracy')->nullable();

            $table->string('device_manufacture', 255)->nullable();
            $table->string('device_model', 255)->nullable();
            $table->string('device_platform', 255)->nullable();
            $table->string('device_version', 255)->nullable();
            $table->text('sats_info')->nullable();
            $table->integer('extra_sat_count')->nullable();
            $table->text('nmea_msg')->nullable();
            $table->text('nmea_location')->nullable();
            $table->float('nmea_distance')->nullable();
            $table->text('network_info')->nullable();
            $table->text('network_location')->nullable();
            $table->float('distance')->nullable();

            $table->integer('flg_checked_location')->nullable();
            $table->string('path', 255)->nullable();
            $table->string('file_name', 255)->nullable();
            $table->dateTime('timestamp');

            $table->string('digest', 255)->nullable()->index('idx_digest');
            $table->integer('flg_original')->nullable();
            $table->integer('rotation_correction')->default(0);
            $table->integer('flg_deleted')->default(0);

            $table->float('efkLatGpsL1')->nullable();
            $table->float('efkLngGpsL1')->nullable();
            $table->float('efkAltGpsL1')->nullable();
            $table->dateTime('efkTimeGpsL1')->nullable();
            $table->float('efkLatGpsL5')->nullable();
            $table->float('efkLngGpsL5')->nullable();
            $table->float('efkAltGpsL5')->nullable();
            $table->dateTime('efkTimeGpsL5')->nullable();
            $table->float('efkLatGalE1')->nullable();
            $table->float('efkLngGalE1')->nullable();
            $table->float('efkAltGalE1')->nullable();
            $table->dateTime('efkTimeGalE1')->nullable();
            $table->float('efkLatGalE5')->nullable();
            $table->float('efkLngGalE5')->nullable();
            $table->float('efkAltGalE5')->nullable();
            $table->dateTime('efkTimeGalE5')->nullable();
            $table->float('efkLatGalIf')->nullable();
            $table->float('efkLngGalIf')->nullable();
            $table->float('efkAltGalIf')->nullable();
            $table->dateTime('efkTimeGalIf')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('photo');
    }
};
