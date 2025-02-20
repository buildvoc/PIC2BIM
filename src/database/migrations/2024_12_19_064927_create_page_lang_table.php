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
        Schema::create('page_lang', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_id')->constrained('page', 'id')->onUpdate('cascade')->onDelete('cascade');
            $table->string('description', 255)->nullable();
            $table->string('template_param', 45);
            $table->string('cz', 4000)->nullable();
            $table->string('en', 4000)->nullable();
            $table->string('it', 4000)->nullable();
            $table->timestamp('timestamp')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('page_lang');
    }
};
