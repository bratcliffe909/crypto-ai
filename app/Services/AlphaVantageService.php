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

    /**
     * Get RSI (Relative Strength Index) for a symbol
     */
    public function getRSI($symbol, $interval = 'daily', $timePeriod = 14, $seriesType = 'close')
    {
        $cacheKey = "rsi_{$symbol}_{$interval}_{$timePeriod}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($symbol, $interval, $timePeriod, $seriesType) {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'function' => 'RSI',
                    'symbol' => $symbol,
                    'interval' => $interval,
                    'time_period' => $timePeriod,
                    'series_type' => $seriesType,
                    'apikey' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note']) || isset($data['Information'])) {
                        Log::error('Alpha Vantage RSI API error', [
                            'response' => $data,
                            'symbol' => $symbol,
                            'interval' => $interval,
                            'function' => 'RSI'
                        ]);
                        return [];
                    }
                    
                    return $data;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage RSI API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get MACD (Moving Average Convergence Divergence) for a symbol
     */
    public function getMACD($symbol, $interval = 'daily', $fastPeriod = 12, $slowPeriod = 26, $signalPeriod = 9, $seriesType = 'close')
    {
        $cacheKey = "macd_{$symbol}_{$interval}_{$fastPeriod}_{$slowPeriod}_{$signalPeriod}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($symbol, $interval, $fastPeriod, $slowPeriod, $signalPeriod, $seriesType) {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'function' => 'MACD',
                    'symbol' => $symbol,
                    'interval' => $interval,
                    'fastperiod' => $fastPeriod,
                    'slowperiod' => $slowPeriod,
                    'signalperiod' => $signalPeriod,
                    'series_type' => $seriesType,
                    'apikey' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note']) || isset($data['Information'])) {
                        Log::error('Alpha Vantage MACD API error', [
                            'response' => $data,
                            'symbol' => $symbol,
                            'interval' => $interval,
                            'function' => 'MACD'
                        ]);
                        return [];
                    }
                    
                    return $data;
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage MACD API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
    
    /**
     * Get news sentiment for crypto/financial topics
     */
    public function getNewsSentiment($tickers = 'CRYPTO:BTC', $topics = 'blockchain', $timeFrom = null, $limit = 50)
    {
        $cacheKey = "news_sentiment_{$tickers}_{$topics}_{$limit}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($tickers, $topics, $timeFrom, $limit) {
            try {
                $params = [
                    'function' => 'NEWS_SENTIMENT',
                    'tickers' => $tickers,
                    'topics' => $topics,
                    'limit' => $limit,
                    'apikey' => $this->apiKey
                ];
                
                if ($timeFrom) {
                    $params['time_from'] = $timeFrom;
                }
                
                $response = Http::timeout(30)->get($this->baseUrl, $params);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['Error Message']) || isset($data['Note'])) {
                        Log::error('Alpha Vantage API error', ['response' => $data]);
                        return [];
                    }
                    
                    if (isset($data['feed'])) {
                        // Transform the news data
                        return array_map(function ($article) {
                            return [
                                'title' => $article['title'] ?? '',
                                'url' => $article['url'] ?? '',
                                'summary' => $article['summary'] ?? '',
                                'source' => $article['source'] ?? 'Unknown',
                                'publishedAt' => $article['time_published'] ?? null,
                                'sentiment' => $article['overall_sentiment_label'] ?? 'Neutral',
                                'sentimentScore' => $article['overall_sentiment_score'] ?? 0,
                                'banner' => $article['banner_image'] ?? null,
                                'topics' => $article['topics'] ?? [],
                                'tickers' => $article['ticker_sentiment'] ?? []
                            ];
                        }, $data['feed']);
                    }
                    
                    return [];
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alpha Vantage News API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
}