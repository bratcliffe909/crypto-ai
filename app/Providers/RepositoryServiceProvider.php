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
                $app->make(\App\Services\CoinGeckoService::class)
            );
        });

        // Register WalletRepository as singleton
        $this->app->singleton(WalletRepository::class, function ($app) {
            return new WalletRepository(
                $app->make(\App\Services\CacheService::class),
                $app->make(\App\Services\CoinGeckoService::class)
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
                $app->make(\App\Services\AlternativeMeService::class),
                $cryptoCompareService
            );
        });

        // Register NewsRepository as singleton
        $this->app->singleton(NewsRepository::class, function ($app) {
            $newsAggregatorService = null;
            if ($app->bound(\App\Services\NewsAggregatorService::class)) {
                $newsAggregatorService = $app->make(\App\Services\NewsAggregatorService::class);
            }
            
            $fredService = null;
            if ($app->bound(\App\Services\FredService::class)) {
                $fredService = $app->make(\App\Services\FredService::class);
            }
            
            return new NewsRepository(
                $app->make(\App\Services\CacheService::class),
                $newsAggregatorService,
                $fredService
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