<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CoinGeckoService
{
    private $baseUrl;
    private $apiKey;
    private $cacheService;

    public function __construct(CacheService $cacheService)
    {
        $this->apiKey = config('services.coingecko.key');
        $this->baseUrl = config('services.coingecko.base_url');
        $this->cacheService = $cacheService;
    }

    /**
     * Get market data for cryptocurrencies
     */
    public function getMarkets($vsCurrency = 'usd', $ids = null, $perPage = 100)
    {
        $cacheKey = "coingecko_markets_{$vsCurrency}_{$perPage}" . ($ids ? "_{$ids}" : "");
        
        return $this->cacheService->remember($cacheKey, 60, function () use ($vsCurrency, $ids, $perPage) {
            $params = [
                'vs_currency' => $vsCurrency,
                'order' => 'market_cap_desc',
                'per_page' => $perPage,
                'page' => 1,
                'sparkline' => false,
                'price_change_percentage' => '24h,7d,30d,90d'
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

            throw new \Exception('CoinGecko API failed');
        });
    }

    /**
     * Get simple price data
     */
    public function getSimplePrice($ids, $vsCurrencies = 'usd')
    {
        $cacheKey = "price_{$ids}_{$vsCurrencies}";
        
        return $this->cacheService->remember($cacheKey, 60, function () use ($ids, $vsCurrencies) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/simple/price", [
                'ids' => $ids,
                'vs_currencies' => $vsCurrencies,
                'include_24hr_change' => true
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('CoinGecko price API failed');
        });
    }

    /**
     * Get OHLC data for a coin
     */
    public function getOHLC($id, $vsCurrency = 'usd', $days = 365)
    {
        $cacheKey = "ohlc_{$id}_{$vsCurrency}_{$days}";
        
        return $this->cacheService->remember($cacheKey, 60, function () use ($id, $vsCurrency, $days) {
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

            throw new \Exception('CoinGecko OHLC API failed');
        });
    }

    /**
     * Get market chart data for a coin
     */
    public function getMarketChart($id, $vsCurrency = 'usd', $days = 'max', $interval = 'daily')
    {
        $cacheKey = "market_chart_{$id}_{$vsCurrency}_{$days}_{$interval}";
        
        return $this->cacheService->remember($cacheKey, 60, function () use ($id, $vsCurrency, $days, $interval) {
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

            throw new \Exception('CoinGecko Market Chart API failed');
        });
    }

    /**
     * Get trending coins
     */
    public function getTrending()
    {
        $cacheKey = 'trending';
        
        return $this->cacheService->remember($cacheKey, 60, function () {
            $response = Http::timeout(30)->get("{$this->baseUrl}/search/trending");

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('CoinGecko trending API failed');
        });
    }

    /**
     * Get global market data
     */
    public function getGlobalData()
    {
        $cacheKey = 'global';
        
        return $this->cacheService->remember($cacheKey, 60, function () {
            $response = Http::timeout(30)->get("{$this->baseUrl}/global");

            if ($response->successful()) {
                return $response->json();
            }
            
            if ($response->status() === 429) {
                Log::warning('CoinGecko rate limit exceeded for global data');
                throw new \Exception('Rate limit exceeded');
            }

            throw new \Exception('CoinGecko global API failed');
        });
    }

    /**
     * Search coins
     */
    public function searchCoins($query)
    {
        if (!$query || strlen($query) < 2) {
            return ['data' => [], 'metadata' => ['lastUpdated' => now()->toIso8601String(), 'cacheAge' => 0, 'source' => 'none']];
        }

        $cacheKey = 'search_' . strtolower($query);
        
        return $this->cacheService->remember($cacheKey, 60, function () use ($query) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/search", [
                'query' => $query
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['coins'] ?? [];
            }

            throw new \Exception('CoinGecko search API failed');
        });
    }
    
    /**
     * Get market chart data with intelligent historical caching
     */
    public function getMarketChartHistorical($id, $vsCurrency = 'usd', $days = 'max')
    {
        $cacheKey = "historical_chart_{$id}_{$vsCurrency}_{$days}";
        
        return $this->cacheService->rememberHistorical($cacheKey, function($fromDate, $toDate) use ($id, $vsCurrency, $days) {
            // If we have a specific date range, calculate the days
            if ($fromDate && $toDate) {
                $from = \Carbon\Carbon::parse($fromDate);
                $to = \Carbon\Carbon::parse($toDate);
                $daysToFetch = $from->diffInDays($to) + 1;
                
                // CoinGecko only allows fetching from current date backwards
                // So we fetch more data than needed and filter
                $daysFromNow = $to->diffInDays(now()) + $daysToFetch;
            } else {
                $daysFromNow = $days;
            }
            
            $params = [
                'vs_currency' => $vsCurrency,
                'days' => $daysFromNow,
            ];
            
            // For historical data, use daily interval
            if ($daysFromNow > 1) {
                $params['interval'] = 'daily';
            }
            
            $response = Http::timeout(30)->get("{$this->baseUrl}/coins/{$id}/market_chart", $params);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['prices'])) {
                    // Transform to our standard format
                    $prices = [];
                    foreach ($data['prices'] as $pricePoint) {
                        $date = date('Y-m-d', $pricePoint[0] / 1000);
                        
                        // Filter by date range if specified
                        if ($fromDate && $date < $fromDate) continue;
                        if ($toDate && $date > $toDate) continue;
                        
                        $prices[] = [
                            'date' => $date,
                            'timestamp' => $pricePoint[0],
                            'price' => $pricePoint[1]
                        ];
                    }
                    
                    return $prices;
                }
            }

            if ($response->status() === 429) {
                Log::warning('CoinGecko rate limit exceeded for historical data');
                throw new \Exception('Rate limit exceeded. Using cached data.');
            }

            throw new \Exception('CoinGecko historical chart API failed');
        }, 'date');
    }
}