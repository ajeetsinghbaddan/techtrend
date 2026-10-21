<?php

namespace App\Payments;

use Illuminate\Http\Request;

interface ReceivesWebhooks
{
    /** Verify the webhook's signature and return the payment reference it's about (or null to ignore it). */
    public function webhookReference(Request $request): ?string;
}
