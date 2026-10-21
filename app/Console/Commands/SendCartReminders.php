<?php

namespace App\Console\Commands;

use App\Support\CartReminders;
use Illuminate\Console\Command;

class SendCartReminders extends Command
{
    protected $signature = 'carts:send-reminders';

    protected $description = 'Email shoppers who left items in their bag';

    public function handle(CartReminders $reminders): int
    {
        $reminders->ensureCustomerRecords();
        $sent = $reminders->sendDue();
        $expired = $reminders->expireOld();

        $this->info("Sent {$sent} reminder(s); {$expired} bag(s) expired.");

        return self::SUCCESS;
    }
}
