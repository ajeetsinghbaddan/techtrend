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
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->char('base', 3);
            $table->char('currency', 3);
            $table->decimal('rate', 18, 8);
            $table->date('rate_date');
            $table->timestamps();

            $table->unique(['base', 'currency']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('exchange_rate', 18, 8)->nullable()->after('currency');
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn('exchange_rate'));
        Schema::dropIfExists('exchange_rates');
    }
};
