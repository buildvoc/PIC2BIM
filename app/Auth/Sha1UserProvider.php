<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Support\Arr;

class Sha1UserProvider implements UserProvider
{
    public function retrieveById($identifier)
    {
        return User::find($identifier);
    }

    public function retrieveByToken($identifier, #[\SensitiveParameter] $token)
    {
        // Implement if you are using "remember me" functionality
    }

    public function updateRememberToken(Authenticatable $user, #[\SensitiveParameter] $token)
    {
        // Implement if you are using "remember me" functionality
    }

    public function retrieveByCredentials(#[\SensitiveParameter] array $credentials)
    {
        return User::where('login', Arr::get($credentials, 'username'))->first();
    }

    public function validateCredentials(Authenticatable $user, #[\SensitiveParameter] array $credentials)
    {
        return sha1(Arr::get($credentials, 'password')) == $user->password;
    }

    public function rehashPasswordIfRequired(Authenticatable $user, #[\SensitiveParameter] array $credentials, bool $force = false)
    {
        // TODO: Implement rehashPasswordIfRequired() method.
    }
}
