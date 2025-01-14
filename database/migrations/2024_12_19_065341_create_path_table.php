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
        Schema::create('path', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('user', 'id');
            $table->string('name', 255)->nullable();
            $table->string('device_manufacture', 255)->nullable();
            $table->string('device_model', 255)->nullable();
            $table->string('device_platform', 255)->nullable();
            $table->string('device_version', 255)->nullable();
            $table->timestamp('start');
            $table->timestamp('end');
            $table->double('area')->default(0);
            $table->integer('flg_deleted')->default(0);
            $table->timestamp('timestamp')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('path');
    }
};
