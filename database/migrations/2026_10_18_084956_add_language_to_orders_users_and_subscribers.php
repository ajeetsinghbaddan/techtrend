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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('language', 5)->nullable()->after('locale');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('language', 5)->nullable()->after('preferred_locale');
        });

        Schema::table('subscribers', function (Blueprint $table) {
            $table->string('language', 5)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn('language'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('language'));
        Schema::table('subscribers', fn (Blueprint $table) => $table->dropColumn('language'));
    }
};
