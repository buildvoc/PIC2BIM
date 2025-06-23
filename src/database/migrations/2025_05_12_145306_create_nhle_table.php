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
        if (!Schema::hasTable('nhle_')) {
            Schema::create('nhle_', function (Blueprint $table) {
                $table->id('gid');

                $table->integer('objectid')->nullable();
                $table->integer('listentry')->nullable();

                $table->string('name', 254)->nullable();
                $table->string('grade', 3)->nullable();

                $table->date('listdate')->nullable();
                $table->date('amenddate')->nullable();

                $table->string('capturesca', 7)->nullable();
                $table->string('hyperlink', 66)->nullable();
                $table->string('ngr', 15)->nullable();
                $table->string('easting', 254)->nullable();
                $table->string('northing', 254)->nullable();

            
                $table->geometry('geom')->nullable();

                $table->double('longitude')->nullable();
                $table->double('latitude')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nhle');
    }
};
