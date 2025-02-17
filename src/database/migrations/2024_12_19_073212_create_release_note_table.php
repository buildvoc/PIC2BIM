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
        Schema::create('release_notes', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['web','android','ios']);
            $table->string('version', 255)->nullable();
            $table->text('note_en')->nullable();
            $table->text('note_cz')->nullable();
            $table->text('note_it')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('release_notes');
    }
};
