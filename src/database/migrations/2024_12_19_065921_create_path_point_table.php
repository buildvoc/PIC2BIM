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
        Schema::create('path_point', function (Blueprint $table) {
            $table->id();
            $table->foreignId('path_id')->constrained('path', 'id')->onDelete('cascade');
            $table->double('lat');
            $table->double('lng');
            $table->float('altitude')->nullable();
            $table->float('accuracy')->nullable();
            $table->timestamp('created');
            $table->timestamp('timestamp')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('path_point');
    }
};
