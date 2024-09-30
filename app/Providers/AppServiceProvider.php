<?php

namespace App\Providers;

use App\Auth\Sha1UserProvider;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

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
        // Vite::prefetch(concurrency: 3);
    }
}
