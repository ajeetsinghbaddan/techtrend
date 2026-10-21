<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('key', 20)->unique();
            $table->string('name', 60);
            $table->string('description', 200)->nullable();
            $table->boolean('enabled')->default(false);
            $table->string('mode', 10)->default('test');
            $table->text('credentials')->nullable();
            $table->json('regions')->nullable();
            $table->json('currencies')->nullable();
            $table->json('settings')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('gateway', 20);
            $table->string('status', 20)->default('pending');
            $table->unsignedBigInteger('amount_minor');
            $table->char('currency', 3);
            $table->string('reference', 120)->nullable();
            $table->string('transaction_id', 120)->nullable();
            $table->string('failure_reason', 190)->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['gateway', 'reference']);
            $table->index(['order_id', 'status']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('placed_at');
        });

        // The five methods, all switched off until the admin adds keys.
        $now = now();
        $codRegions = array_key_exists('IN', config('shop.regions', [])) ? json_encode(['IN']) : null;

        $rows = [
            ['stripe', 'Card', 'Visa, Mastercard, American Express and more, via Stripe.', 1, null],
            ['paypal', 'PayPal', 'Pay with your PayPal account or a card.', 2, null],
            ['razorpay', 'UPI, cards & netbanking', 'Pay securely with Razorpay.', 3, null],
            ['paytm', 'Paytm', 'UPI, Paytm wallet, cards and netbanking.', 4, null],
            ['cod', 'Cash on delivery', 'Pay in cash when your order arrives.', 5, $codRegions],
        ];

        DB::table('payment_gateways')->insert(array_map(fn (array $r) => [
            'key' => $r[0],
            'name' => $r[1],
            'description' => $r[2],
            'position' => $r[3],
            'regions' => $r[4],
            'enabled' => false,
            'mode' => 'test',
            'credentials' => null,
            'currencies' => null,
            'settings' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $rows));
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn('paid_at'));
        Schema::dropIfExists('payments');
        Schema::dropIfExists('payment_gateways');
    }
};
