<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
|
| Here we define the scheduled tasks for the application.
|
*/

// Update market overview cache every 5 minutes
Schedule::command('market:update-cache')
    ->everyFiveMinutes()
    ->name('market-overview-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/market-cache.log'));

// Update wallet cache every hour
Schedule::command('wallet:update-cache')
    ->hourly()
    ->name('wallet-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/wallet-cache.log'));

// Update news and calendar cache every hour (30 minutes offset from wallet cache)
Schedule::command('cache:update-news-calendar')
    ->hourlyAt(30)
    ->name('news-calendar-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/news-calendar-cache.log'));

// Update market data (Fear & Greed, Global Stats, Trending) every hour (15 minutes offset)
Schedule::command('cache:update-market-data')
    ->hourlyAt(15)
    ->name('market-data-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/market-data-cache.log'));

// Update indicators (Pi Cycle, Rainbow Chart, Altcoin Season, RSI) daily at midnight
Schedule::command('cache:update-indicators')
    ->hourlyAt(30)
    ->name('indicator-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/indicator-cache.log'));

// Update market sentiment and social activity cache every hour (45 minutes offset)
Schedule::command('sentiment:update-cache')
    ->hourlyAt(45)
    ->name('sentiment-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/sentiment-cache.log'));
