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
        Schema::create('task', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('user', 'id');
            $table->foreignId('created_id')->constrained('user', 'id');
            $table->foreignId('type_id')->nullable()->constrained('task_type', 'id');
            $table->string('status', 255)->default('new');
            $table->string('name', 255)->nullable();
            $table->text('text')->nullable();
            $table->text('text_returned')->nullable();
            $table->text('text_reason')->nullable();
            $table->timestamp('date_created')->nullable();
            $table->timestamp('task_due_date')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('timestamp');
            $table->integer('flg_deleted')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task');
    }
};
