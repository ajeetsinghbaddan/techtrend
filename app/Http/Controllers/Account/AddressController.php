<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddressRequest;
use App\Models\Address;
use App\Support\Storefront;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        return Storefront::render('account/addresses', [
            'addresses' => $request->user()->addresses()
                ->orderByDesc('is_default_shipping')
                ->orderByDesc('is_default_billing')
                ->latest()
                ->get()
                ->map(fn (Address $address) => $address->present()),
            'maxAddresses' => Address::MAX_PER_USER,
        ]);
    }

    public function store(AddressRequest $request)
    {
        $user = $request->user();

        if ($user->addresses()->count() >= Address::MAX_PER_USER) {
            return back()->withErrors([
                'address' => __('You can save up to :count addresses.', ['count' => Address::MAX_PER_USER]),
            ]);
        }

        $isFirst = ! $user->addresses()->exists();
        $address = $user->addresses()->create($request->addressData());

        $this->applyDefaults($address, $request, $isFirst);

        return back()->with('account_notice', __('Address saved.'));
    }

    public function update(AddressRequest $request, int $address)
    {
        $model = $this->owned($request, $address);
        $model->update($request->addressData());

        $this->applyDefaults($model, $request, false);

        return back()->with('account_notice', __('Address updated.'));
    }

    public function destroy(Request $request, int $address)
    {
        $this->owned($request, $address)->delete();

        return back()->with('account_notice', __('Address deleted.'));
    }

    public function makeDefault(Request $request, int $address, string $type)
    {
        $this->owned($request, $address)->makeDefault($type);

        return back();
    }

    /** Only the customer's own addresses can be found; anything else is a 404. */
    private function owned(Request $request, int $id): Address
    {
        return $request->user()->addresses()->findOrFail($id);
    }

    private function applyDefaults(Address $address, AddressRequest $request, bool $isFirst): void
    {
        if ($isFirst || $request->boolean('default_shipping')) {
            $address->makeDefault('shipping');
        }

        if ($isFirst || $request->boolean('default_billing')) {
            $address->makeDefault('billing');
        }
    }
}
