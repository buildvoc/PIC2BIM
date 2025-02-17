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
        Schema::create('pa_flag', function (Blueprint $table) {
            $table->id();
            $table->string('flag', 45);
            $table->timestamp('timestamp');
            $table->integer('task_id')->nullable();
            $table->integer('flag_id')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pa_flag');
    }
};
