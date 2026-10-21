<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_recoveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('language', 5)->nullable();
            $table->char('region', 2)->nullable();
            $table->string('token', 48)->unique();
            $table->boolean('consent')->default(false);
            // active, clicked, converted, purchased, unsubscribed, expired
            $table->string('status', 20)->default('active');
            $table->unsignedTinyInteger('reminders_sent')->default(0);
            $table->timestamp('last_reminder_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->unsignedBigInteger('value_minor')->nullable();
            $table->char('currency', 3)->nullable();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('order_total_minor')->nullable();
            $table->timestamps();

            $table->index(['status', 'consent']);
            $table->index('email');
        });

        Schema::create('email_opt_outs', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('topic', 40);
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['email', 'topic']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('cart_reminders')->default(true);
        });

        if (! Schema::hasIndex('carts', ['updated_at'])) {
            Schema::table('carts', fn (Blueprint $table) => $table->index('updated_at'));
        }
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('cart_reminders'));
        Schema::dropIfExists('email_opt_outs');
        Schema::dropIfExists('cart_recoveries');
    }
};
