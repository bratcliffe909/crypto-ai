<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AlphaVantageService
{
    private $baseUrl;
    private $apiKey;
    private $cacheTime = 300; // 5 minutes

    public function __construct()
    {
        $this->apiKey = config('services.alpha_vantage.key');
        $this->baseUrl = config('services.alpha_vantage.base_url');
    }

    /**
     * Get Simple Moving Average (SMA) for a symbol
     */
    public function getSMA($symbol, $interval = 'weekly', $timePeriod = 20, $seriesType = 'close')
    {
        $cacheKey = "sma_{$symbol}_{$interval}_{$timePeriod}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($symbol, $interval, $timePeriod, $seriesType) {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'function' => 'SMA',
                    'symbol' => $symbol,
                    'interval' => $interval,
                    'time_period' => $timePeriod,
                    'series_type' => $seriesType,
                    'apikey' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note'])) {
                        Log::error('Alpha Vantage API error', ['response' => $data]);
                        return [];
                    }
                    
                    return $data;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage SMA API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get Exponential Moving Average (EMA) for a symbol
     */
    public function getEMA($symbol, $interval = 'weekly', $timePeriod = 21, $seriesType = 'close')
    {
        $cacheKey = "ema_{$symbol}_{$interval}_{$timePeriod}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($symbol, $interval, $timePeriod, $seriesType) {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'function' => 'EMA',
                    'symbol' => $symbol,
                    'interval' => $interval,
                    'time_period' => $timePeriod,
                    'series_type' => $seriesType,
                    'apikey' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note'])) {
                        Log::error('Alpha Vantage API error', ['response' => $data]);
                        return [];
                    }
                    
                    return $data;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage EMA API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get weekly digital currency data
     */
    public function getDigitalCurrencyWeekly($symbol, $market = 'USD')
    {
        $cacheKey = "digital_currency_weekly_{$symbol}_{$market}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($symbol, $market) {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'function' => 'DIGITAL_CURRENCY_WEEKLY',
                    'symbol' => $symbol,
                    'market' => $market,
                    'apikey' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note'])) {
                        Log::error('Alpha Vantage API error', ['response' => $data]);
                        return [];
                    }
                    
                    return $data;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage Digital Currency API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get daily digital currency data
     */
    public function getDigitalCurrencyDaily($symbol, $market = 'USD')
    {
        $cacheKey = "digital_currency_daily_{$symbol}_{$market}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($symbol, $market) {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'function' => 'DIGITAL_CURRENCY_DAILY',
                    'symbol' => $symbol,
                    'market' => $market,
                    'apikey' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note'])) {
                        Log::error('Alpha Vantage API error', ['response' => $data]);
                        return [];
                    }
                    
                    return $data;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage Digital Currency Daily API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
}