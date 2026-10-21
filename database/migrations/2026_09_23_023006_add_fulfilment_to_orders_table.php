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
            $table->string('tracking_number', 60)->nullable()->after('payment_method');
            $table->string('tracking_url', 255)->nullable()->after('tracking_number');
            $table->text('admin_notes')->nullable()->after('notes');
            $table->timestamp('shipped_at')->nullable()->after('placed_at');
            $table->timestamp('cancelled_at')->nullable()->after('shipped_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tracking_number', 'tracking_url', 'admin_notes', 'shipped_at', 'cancelled_at']);
        });
    }
};
