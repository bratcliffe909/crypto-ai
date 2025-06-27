<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CoinGeckoService
{
    private $baseUrl;
    private $apiKey;
    private $cacheTime = 300; // 5 minutes

    public function __construct()
    {
        $this->apiKey = config('services.coingecko.key');
        $this->baseUrl = config('services.coingecko.base_url');
    }

    /**
     * Get market data for cryptocurrencies
     */
    public function getMarkets($vsCurrency = 'usd', $ids = null, $perPage = 100)
    {
        $cacheKey = "markets_{$vsCurrency}_{$ids}_{$perPage}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($vsCurrency, $ids, $perPage) {
            try {
                $params = [
                    'vs_currency' => $vsCurrency,
                    'order' => 'market_cap_desc',
                    'per_page' => $perPage,
                    'page' => 1,
                    'sparkline' => false,
                    'price_change_percentage' => '24h'
                ];

                if ($ids) {
                    $params['ids'] = $ids;
                }

                $response = Http::timeout(30)->get("{$this->baseUrl}/coins/markets", $params);

                if ($response->successful()) {
                    return $response->json();
                }

                Log::error('CoinGecko API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get simple price data
     */
    public function getSimplePrice($ids, $vsCurrencies = 'usd')
    {
        $cacheKey = "price_{$ids}_{$vsCurrencies}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($ids, $vsCurrencies) {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/simple/price", [
                    'ids' => $ids,
                    'vs_currencies' => $vsCurrencies,
                    'include_24hr_change' => true
                ]);

                if ($response->successful()) {
                    return $response->json();
                }

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko price API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get OHLC data for a coin
     */
    public function getOHLC($id, $vsCurrency = 'usd', $days = 365)
    {
        $cacheKey = "ohlc_{$id}_{$vsCurrency}_{$days}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($id, $vsCurrency, $days) {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/coins/{$id}/ohlc", [
                    'vs_currency' => $vsCurrency,
                    'days' => $days
                ]);

                if ($response->successful()) {
                    return $response->json();
                }

                if ($response->status() === 429) {
                    Log::warning('CoinGecko rate limit exceeded');
                    throw new \Exception('Rate limit exceeded. Please wait a moment.');
                }

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko OHLC API exception', ['error' => $e->getMessage()]);
                throw $e;
            }
        });
    }

    /**
     * Get market chart data for a coin
     */
    public function getMarketChart($id, $vsCurrency = 'usd', $days = 'max', $interval = 'daily')
    {
        $cacheKey = "market_chart_{$id}_{$vsCurrency}_{$days}_{$interval}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($id, $vsCurrency, $days, $interval) {
            try {
                $params = [
                    'vs_currency' => $vsCurrency,
                    'days' => $days,
                ];
                
                if ($interval) {
                    $params['interval'] = $interval;
                }
                
                $response = Http::timeout(30)->get("{$this->baseUrl}/coins/{$id}/market_chart", $params);

                if ($response->successful()) {
                    return $response->json();
                }

                if ($response->status() === 429) {
                    Log::warning('CoinGecko rate limit exceeded');
                    throw new \Exception('Rate limit exceeded. Please wait a moment.');
                }

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko Market Chart API exception', ['error' => $e->getMessage()]);
                throw $e;
            }
        });
    }

    /**
     * Get trending coins
     */
    public function getTrending()
    {
        $cacheKey = 'trending';
        
        return Cache::remember($cacheKey, $this->cacheTime, function () {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/search/trending");

                if ($response->successful()) {
                    return $response->json();
                }

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko trending API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get global market data
     */
    public function getGlobalData()
    {
        $cacheKey = 'global';
        
        return Cache::remember($cacheKey, $this->cacheTime, function () {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/global");

                if ($response->successful()) {
                    return $response->json();
                }

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko global API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Search coins
     */
    public function searchCoins($query)
    {
        if (!$query || strlen($query) < 2) {
            return [];
        }

        $cacheKey = 'search_' . strtolower($query);
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($query) {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/search", [
                    'query' => $query
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['coins'] ?? [];
                }

                return [];
            } catch (\Exception $e) {
                Log::error('CoinGecko search API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
}
