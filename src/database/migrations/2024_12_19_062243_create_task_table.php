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
            $table->bigIncrements('id');
            $table->bigInteger('user_id')->unsigned();
            $table->bigInteger('created_id')->unsigned();
            $table->bigInteger('type_id')->unsigned()->nullable();
            $table->string('status', 255)->default('new');
            $table->string('name', 255)->nullable();
            $table->text('text')->nullable();
            $table->text('text_returned')->nullable();
            $table->text('text_reason')->nullable();
            $table->timestamp('date_created')->nullable();
            $table->timestamp('task_due_date')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('timestamp')->useCurrent();
            $table->integer('flg_deleted')->default(0);
            $table->integer('task_id')->nullable();
            $table->integer('flag_id')->nullable();

            // Foreign keys
            $table->foreign('user_id')->references('id')->on('user')->onDelete('NO ACTION')->onUpdate('NO ACTION');
            $table->foreign('created_id')->references('id')->on('user')->onDelete('NO ACTION')->onUpdate('NO ACTION');
            $table->foreign('type_id')->references('id')->on('task_type')->onDelete('NO ACTION')->onUpdate('NO ACTION');
        
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
