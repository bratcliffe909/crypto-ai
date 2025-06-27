<?php

use App\Http\Controllers\Api\MarketDataController;
use App\Http\Controllers\Api\ChartController;
use App\Http\Controllers\Api\IndicatorController;
use Illuminate\Support\Facades\Route;

// Apply web middleware group to enable sessions and CSRF
Route::middleware(['web'])->group(function () {
    
Route::prefix('crypto')->group(function () {
    // Market data endpoints
    Route::get('/markets', [MarketDataController::class, 'index']);
    Route::get('/price/{ids}', [MarketDataController::class, 'price']);
    Route::get('/trending', [MarketDataController::class, 'trending']);
    Route::get('/search', [MarketDataController::class, 'search']);
    
    // Chart data endpoints
    Route::get('/ohlc/{id}', [ChartController::class, 'ohlc']);
    Route::get('/bull-market-band', [ChartController::class, 'bullMarketBand']);
    
    // Indicator endpoints
    Route::get('/fear-greed', [IndicatorController::class, 'fearGreed']);
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