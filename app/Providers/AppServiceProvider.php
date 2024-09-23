<?php

namespace App\Providers;

use App\Auth\Sha1UserProvider;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::provider('sha1', function (Application $app, array $config) {
            return new Sha1UserProvider();
        });

        if (env('APP_ENV') !== 'local') {
            URL::forceScheme('https');
        }
    }
}
