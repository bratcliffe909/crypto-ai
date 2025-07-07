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

// Update wallet cache every hour
Schedule::command('wallet:update-cache')
    ->hourly()
    ->name('wallet-cache-update')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/wallet-cache.log'));
