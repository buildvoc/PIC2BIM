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
        Schema::table('photo', function (Blueprint $table) {
            $table->string('provider', 255)->nullable();
            $table->string('osnma_enabled', 255)->nullable();
            $table->string('osnma_validated', 255)->nullable();
            $table->string('validated_sats', 255)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('photo', function (Blueprint $table) {
            $table->dropColumn(['provider', 'osnma_enabled', 'osnma_validated', 'validated_sats']);
        });
    }
};
