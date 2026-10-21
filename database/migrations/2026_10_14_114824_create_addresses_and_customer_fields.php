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
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 40)->nullable();
            $table->string('first_name', 60);
            $table->string('last_name', 60);
            $table->string('line1', 120);
            $table->string('line2', 120)->nullable();
            $table->string('postcode', 20);
            $table->string('city', 80);
            $table->char('country', 2);
            $table->string('phone', 30)->nullable();
            $table->boolean('is_default_shipping')->default(false);
            $table->boolean('is_default_billing')->default(false);
            $table->timestamps();

            $table->index('user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('preferred_locale', 5)->nullable();
            $table->char('preferred_region', 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'preferred_locale', 'preferred_region']);
        });

        Schema::dropIfExists('addresses');
    }
};
