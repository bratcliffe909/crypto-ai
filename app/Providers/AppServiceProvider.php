<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register CacheService as singleton
        $this->app->singleton(\App\Services\CacheService::class, function ($app) {
            return new \App\Services\CacheService();
        });

        // Register services with CacheService dependency
        $this->app->singleton(\App\Services\CoinGeckoService::class, function ($app) {
            return new \App\Services\CoinGeckoService(
                $app->make(\App\Services\CacheService::class)
            );
        });

        $this->app->singleton(\App\Services\AlphaVantageService::class, function ($app) {
            return new \App\Services\AlphaVantageService(
                $app->make(\App\Services\CacheService::class)
            );
        });

        $this->app->singleton(\App\Services\AlternativeService::class, function ($app) {
            return new \App\Services\AlternativeService(
                $app->make(\App\Services\CacheService::class)
            );
        });

        $this->app->singleton(\App\Services\FinnhubService::class, function ($app) {
            return new \App\Services\FinnhubService(
                $app->make(\App\Services\CacheService::class)
            );
        });

        $this->app->singleton(\App\Services\FREDService::class, function ($app) {
            return new \App\Services\FREDService(
                $app->make(\App\Services\CacheService::class)
            );
        });

        $this->app->singleton(\App\Services\EconomicCalendarService::class, function ($app) {
            return new \App\Services\EconomicCalendarService(
                $app->make(\App\Services\FREDService::class),
                $app->make(\App\Services\FinnhubService::class),
                $app->make(\App\Services\CacheService::class)
            );
        });

        $this->app->singleton(\App\Services\CryptoCompareService::class, function ($app) {
            return new \App\Services\CryptoCompareService(
                $app->make(\App\Services\CacheService::class)
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Share donation address with all Inertia responses
        Inertia::share([
            'ethDonationAddress' => config('app.eth_donation_address'),
        ]);
    }
}
