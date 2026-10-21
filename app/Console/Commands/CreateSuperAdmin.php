<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create';

    protected $description = 'Create a super admin user, or promote an existing user';

    public function handle(): int
    {
        $name = text(label: 'Name', required: true);

        $email = text(
            label: 'Email',
            required: true,
            validate: fn (string $value) => Validator::make(
                ['email' => $value],
                ['email' => 'email']
            )->fails() ? 'Enter a valid email address.' : null
        );

        $password = password(
            label: 'Password (min 12 characters)',
            required: true,
            validate: fn (string $value) => strlen($value) < 12
                ? 'Use at least 12 characters.'
                : null
        );

        $user = User::firstOrNew(['email' => $email]);
        $user->name = $name;
        $user->password = $password;
        $user->is_super_admin = true;
        $user->email_verified_at ??= now();
        $user->save();

        $this->info("Super admin ready: {$user->email}");

        return self::SUCCESS;
    }
}
