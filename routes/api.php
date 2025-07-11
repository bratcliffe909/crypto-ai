<?php

use App\Http\Controllers\Api\MarketDataController;
use App\Http\Controllers\Api\ChartController;
use App\Http\Controllers\Api\IndicatorController;
use App\Http\Controllers\Api\MarketMetricsController;
use App\Http\Controllers\Api\AltcoinSeasonController;
use App\Http\Controllers\Api\SystemStatusController;
use App\Http\Controllers\Api\SentimentController;
use Illuminate\Support\Facades\Route;

// Apply web middleware group to enable sessions and CSRF
Route::middleware(['web'])->group(function () {
    
Route::prefix('crypto')->group(function () {
    // Market data endpoints
    Route::get('/markets', [MarketDataController::class, 'index']);
    Route::get('/price/{ids}', [MarketDataController::class, 'price']);
    Route::get('/trending', [MarketDataController::class, 'trending']);
    Route::get('/search', [MarketDataController::class, 'search']);
    Route::get('/wallet-coins', [MarketDataController::class, 'walletCoins']);
    Route::post('/refresh-coin/{coinId}', [MarketDataController::class, 'refreshCoin']);
    
    // Chart data endpoints
    Route::get('/ohlc/{id}', [ChartController::class, 'ohlc']);
    Route::get('/bull-market-band', [ChartController::class, 'bullMarketBand']);
    Route::get('/pi-cycle-top', [ChartController::class, 'piCycleTop']);
    Route::get('/rainbow-chart', [ChartController::class, 'rainbowChart']);
    Route::get('/rainbow-chart/status', [ChartController::class, 'rainbowChartStatus']);
    
    // Indicator endpoints
    Route::get('/fear-greed', [IndicatorController::class, 'fearGreed']);
    Route::get('/indicators/{symbol}', [IndicatorController::class, 'getIndicators']);
    Route::get('/economic-calendar', [IndicatorController::class, 'economicCalendar']);
    Route::get('/news-feed', [IndicatorController::class, 'newsFeed']);
    
    // Market metrics endpoints
    Route::get('/market-metrics/global', [MarketMetricsController::class, 'globalMetrics']);
    Route::get('/market-metrics/breadth', [MarketMetricsController::class, 'marketBreadth']);
    Route::get('/market-metrics/volatility', [MarketMetricsController::class, 'volatilityMetrics']);
    
    // Altcoin season endpoint
    Route::get('/altcoin-season', [AltcoinSeasonController::class, 'index']);
    
    // Exchange rates
    Route::get('/exchange-rates', [MarketDataController::class, 'exchangeRates']);
    
    // System status
    Route::get('/system-status', [SystemStatusController::class, 'index']);
    
    // Sentiment and social data
    Route::get('/market-sentiment', [SentimentController::class, 'marketSentiment']);
    Route::get('/social-activity', [SentimentController::class, 'socialActivity']);
    Route::post('/market-sentiment/update', [SentimentController::class, 'updateMarketSentiment']);
    Route::post('/social-activity/update', [SentimentController::class, 'updateSocialActivity']);
});

// Test route
Route::get('/test', function () {
    return response()->json(['message' => 'API is working']);
});

// CSRF Token route
Route::get('/csrf-token', function () {
    return response()->json(['csrf_token' => csrf_token()]);
});

}); // End of web middleware group