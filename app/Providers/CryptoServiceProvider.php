<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\CoinGeckoService;
use App\Services\AlternativeService;

class CryptoServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(CoinGeckoService::class, function ($app) {
            return new CoinGeckoService();
        });

        $this->app->singleton(AlternativeService::class, function ($app) {
            return new AlternativeService();
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
