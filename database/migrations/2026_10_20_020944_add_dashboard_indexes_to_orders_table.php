<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasIndex('orders', ['status', 'placed_at'])) {
                $table->index(['status', 'placed_at']);
            }
            if (! Schema::hasIndex('orders', ['placed_at'])) {
                $table->index('placed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status', 'placed_at']);
            $table->dropIndex(['placed_at']);
        });
    }
};
