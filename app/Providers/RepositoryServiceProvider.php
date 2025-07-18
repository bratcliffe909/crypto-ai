<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\MarketDataRepository;
use App\Repositories\WalletRepository;
use App\Repositories\IndicatorRepository;
use App\Repositories\AltcoinSeasonRepository;
use App\Repositories\SentimentRepository;
use App\Repositories\NewsRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */
    public function register()
    {
        // Register MarketDataRepository as singleton
        $this->app->singleton(MarketDataRepository::class, function ($app) {
            return new MarketDataRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\CoinGeckoService::class),
                $app->make(\App\Services\WalletCacheService::class)
            );
        });

        // Register WalletRepository as singleton
        $this->app->singleton(WalletRepository::class, function ($app) {
            return new WalletRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\CoinGeckoService::class),
                $app->make(\App\Services\WalletCacheService::class)
            );
        });

        // Register IndicatorRepository as singleton
        $this->app->singleton(IndicatorRepository::class, function ($app) {
            $cryptoCompareService = null;
            if ($app->bound(\App\Services\CryptoCompareService::class)) {
                $cryptoCompareService = $app->make(\App\Services\CryptoCompareService::class);
            }
            
            return new IndicatorRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\CoinGeckoService::class),
                $cryptoCompareService
            );
        });

        // Register AltcoinSeasonRepository as singleton
        $this->app->singleton(AltcoinSeasonRepository::class, function ($app) {
            return new AltcoinSeasonRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\CoinGeckoService::class)
            );
        });

        // Register SentimentRepository as singleton
        $this->app->singleton(SentimentRepository::class, function ($app) {
            $cryptoCompareService = null;
            if ($app->bound(\App\Services\CryptoCompareService::class)) {
                $cryptoCompareService = $app->make(\App\Services\CryptoCompareService::class);
            }
            
            return new SentimentRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\AlternativeService::class),
                $cryptoCompareService
            );
        });

        // Register NewsRepository as singleton
        $this->app->singleton(NewsRepository::class, function ($app) {
            return new NewsRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\FinnhubService::class)
            );
        });
        
        // Register RainbowChartService with IndicatorRepository dependency
        $this->app->singleton(\App\Services\RainbowChartService::class, function ($app) {
            return new \App\Services\RainbowChartService(
                $app->make(IndicatorRepository::class)
            );
        });
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot()
    {
        //
    }
}