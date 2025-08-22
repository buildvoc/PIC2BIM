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
        Schema::create('lus_fts_site_siteaddressref', function (Blueprint $table) {
            $table->bigInteger('uprn');
            $table->uuid('siteid');
            $table->date('siteversiondate');
            $table->string('relationshiptype', 30);

            $table->primary(['uprn', 'siteid', 'siteversiondate', 'relationshiptype'], 'lus_fts_site_siteaddressref_primary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lus_fts_site_siteaddressref');
    }
};
