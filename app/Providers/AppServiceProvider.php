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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
