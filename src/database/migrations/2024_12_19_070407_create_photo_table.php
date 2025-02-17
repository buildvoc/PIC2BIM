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
            $table->bigIncrements('id');
            $table->bigInteger('user_id')->unsigned()->nullable();
            $table->bigInteger('task_id')->unsigned()->nullable();
            $table->text('note')->nullable();
            $table->float('lat')->nullable();
            $table->float('lng')->nullable();
            $table->float('centroidLat')->nullable();
            $table->float('centroidLng')->nullable();
            $table->double('altitude')->nullable();
            $table->timestamp('created')->nullable();
            $table->double('bearing')->nullable();
            $table->double('magnetic_azimuth')->nullable();
            $table->double('photo_heading')->nullable();
            $table->double('photo_angle')->nullable();
            $table->double('roll')->nullable();
            $table->double('pitch')->nullable();
            $table->integer('orientation')->nullable();
            $table->double('horizontal_view_angle')->nullable();
            $table->double('vertical_view_angle')->nullable();
            $table->double('accuracy')->nullable();
            $table->string('device_manufacture', 255)->nullable();
            $table->string('device_model', 255)->nullable();
            $table->string('device_platform', 255)->nullable();
            $table->string('device_version', 255)->nullable();
            $table->text('sats_info')->nullable();
            $table->integer('extra_sat_count')->nullable();
            $table->text('nmea_msg')->nullable();
            $table->text('nmea_location')->nullable();
            $table->double('nmea_distance')->nullable();
            $table->text('network_info')->nullable();
            $table->text('network_location')->nullable();
            $table->double('distance')->nullable();
            $table->integer('flg_checked_location')->nullable();
            $table->string('path', 255)->nullable();
            $table->string('file_name', 255)->nullable();
            $table->timestamp('timestamp')->useCurrent();
            $table->string('digest', 255)->nullable();
            $table->integer('flg_original')->nullable();
            $table->integer('rotation_correction')->default(0);
            $table->integer('flg_deleted')->default(0);
            $table->double('efkLatGpsL1')->nullable();
            $table->double('efkLngGpsL1')->nullable();
            $table->double('efkAltGpsL1')->nullable();
            $table->timestamp('efkTimeGpsL1')->nullable();
            $table->double('efkLatGpsL5')->nullable();
            $table->double('efkLngGpsL5')->nullable();
            $table->double('efkAltGpsL5')->nullable();
            $table->timestamp('efkTimeGpsL5')->nullable();
            $table->double('efkLatGalE1')->nullable();
            $table->double('efkLngGalE1')->nullable();
            $table->double('efkAltGalE1')->nullable();
            $table->timestamp('efkTimeGalE1')->nullable();
            $table->double('efkLatGalE5')->nullable();
            $table->double('efkLngGalE5')->nullable();
            $table->double('efkAltGalE5')->nullable();
            $table->timestamp('efkTimeGalE5')->nullable();
            $table->double('efkLatGalIf')->nullable();
            $table->double('efkLngGalIf')->nullable();
            $table->double('efkAltGalIf')->nullable();
            $table->timestamp('efkTimeGalIf')->nullable();
            $table->float('efkLatGpsIf')->nullable();
            $table->float('efkLngGpsIf')->nullable();
            $table->float('efkAltGpsIf')->nullable();
            $table->string('efkTimeGpsIf', 50)->nullable();

            // Indexes
            $table->index('digest');
            $table->index('task_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('photo', function (Blueprint $table) {
            $table->dropIndex(['digest']);
            $table->dropIndex(['task_id']);
        });
        Schema::dropIfExists('photo');
    }
};
