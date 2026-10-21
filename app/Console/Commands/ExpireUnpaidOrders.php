<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Payments\PaymentManager;
use Illuminate\Console\Command;
use Throwable;

class ExpireUnpaidOrders extends Command
{
    protected $signature = 'orders:expire-unpaid';

    protected $description = 'Cancel online orders that were never paid, and put their stock back';

    public function handle(PaymentManager $payments): int
    {
        $cancelled = 0;

        Order::query()
            ->where('status', 'pending')
            ->whereNull('paid_at')
            ->where('payment_method', '!=', 'cod')
            ->where('placed_at', '<', now()->subMinutes(PaymentManager::UNPAID_MINUTES))
            ->with('payments')
            ->chunkById(50, function ($orders) use ($payments, &$cancelled) {
                foreach ($orders as $order) {
                    // Last chance: maybe the money arrived and nobody told us.
                    foreach ($order->payments->where('status', 'pending') as $payment) {
                        try {
                            $payments->refresh($payment);
                        } catch (Throwable $e) {
                            report($e);
                            continue 2; // provider unreachable: don't cancel while unsure
                        }
                    }

                    if ($payments->cancelUnpaid($order)) {
                        $cancelled++;
                    }
                }
            });

        $this->info("Cancelled {$cancelled} unpaid order(s).");

        return self::SUCCESS;
    }
}
