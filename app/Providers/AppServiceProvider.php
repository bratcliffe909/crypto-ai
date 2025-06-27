<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\CoinGeckoService::class, function ($app) {
            return new \App\Services\CoinGeckoService();
        });

        $this->app->singleton(\App\Services\AlphaVantageService::class, function ($app) {
            return new \App\Services\AlphaVantageService();
        });

        $this->app->singleton(\App\Services\AlternativeService::class, function ($app) {
            return new \App\Services\AlternativeService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
