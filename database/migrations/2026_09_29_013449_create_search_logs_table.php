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
        Schema::create('search_logs', function (Blueprint $table) {
            $table->id();
            $table->string('term', 100);
            $table->string('locale', 5);
            $table->unsignedInteger('results')->default(0);
            $table->unsignedInteger('hits')->default(1);
            $table->timestamp('last_searched_at');
            $table->timestamps();

            $table->unique(['term', 'locale']);
            $table->index('results');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_logs');
    }
};
