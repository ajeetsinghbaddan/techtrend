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
        Schema::create('consent_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('consent_id');
            $table->unsignedSmallInteger('version');
            $table->boolean('analytics');
            $table->boolean('marketing');
            $table->string('locale', 5)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('consent_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consent_logs');
    }
};
