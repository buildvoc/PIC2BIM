<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_links', function (Blueprint $table) {
            $table->bigIncrements('id');

            // Source node
            $table->string('src_type', 32)->comment('photo, building, building_part, site, nhle');
            $table->string('src_id', 128)->comment('ID of source node');

            // Relation
            $table->string('relation', 64)->comment('e.g. bearing_match, photo_of');

            // Destination node
            $table->string('dst_type', 32)->comment('photo, building, building_part, site, nhle');
            $table->string('dst_id', 128)->comment('ID of destination node');

            // Link status
            $table->string('status', 16)->default('proposed')->comment('proposed|verified|rejected');
            $table->string('source', 32)->default('auto_bearing')->comment('auto_bearing|manual_officer|import');

            // Additional metadata
            $table->decimal('confidence', 4, 3)->nullable()->comment('confidence level of the link');
            $table->decimal('bearing_delta', 6, 2)->nullable()->comment('bearing delta between source and destination nodes');
            $table->decimal('distance_m', 10, 2)->nullable()->comment('distance between source and destination nodes in meters');
            $table->text('note')->nullable()->comment('additional note or comment about the link');

            // Audit
            $table->bigInteger('created_by')->nullable()->comment('ID of user who created the link');
            $table->bigInteger('verified_by')->nullable()->comment('ID of user who verified the link');
            $table->timestampsTz();
        });

        // Index
        Schema::table('entity_links', function (Blueprint $table) {
            $table->unique(['src_type','src_id','relation','dst_type','dst_id'], 'ux_entity_links_unique');
            $table->index(['src_type','src_id','relation','status'], 'ix_entity_links_src');
            $table->index(['dst_type','dst_id','relation','status'], 'ix_entity_links_dst');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_links');
    }
};