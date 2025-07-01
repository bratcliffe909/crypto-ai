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
        
        // Use longer cache for wallet coins (5 minutes instead of 1)
        $cacheDuration = $ids ? 300 : 60;
        
        return $this->cacheService->remember($cacheKey, $cacheDuration, function () use ($vsCurrency, $ids, $perPage) {
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
                $data = $response->json();
                
                // Cache each coin individually for future use
                if ($ids && is_array($data)) {
                    foreach ($data as $coin) {
                        $this->cacheIndividualCoin($coin);
                    }
                }
                
                return $data;
            }

            Log::error('CoinGecko API error', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            // If rate limited and we have specific IDs, try to build from individual caches
            if ($response->status() === 429 && $ids) {
                Log::warning('CoinGecko rate limit hit, building from individual caches');
                $data = $this->buildFromIndividualCaches($ids);
                if (!empty($data)) {
                    return $data;
                }
            }

            throw new \Exception('CoinGecko API failed');
        });
    }

    /**
     * Get simple price data
     */
    public function getSimplePrice($ids, $vsCurrencies = 'usd')
    {
        $cacheKey = "price_{$ids}_{$vsCurrencies}";
        
        return $this->cacheService->remember($cacheKey, 60, function () use ($ids, $vsCurrencies, $cacheKey) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/simple/price", [
                'ids' => $ids,
                'vs_currencies' => $vsCurrencies,
                'include_24hr_change' => true
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            // If rate limited, try to return cached data
            if ($response->status() === 429) {
                Log::warning('CoinGecko rate limit hit for prices, using extended cache');
                $cachedData = $this->cacheService->getStale($cacheKey);
                if ($cachedData !== null) {
                    return $cachedData;
                }
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
    
    /**
     * Cache individual coin data
     */
    private function cacheIndividualCoin($coinData)
    {
        if (!isset($coinData['id'])) {
            return;
        }
        
        $cacheKey = "coin_data_{$coinData['id']}";
        $metaKey = $cacheKey . '_meta';
        
        // Cache for 5 minutes
        \Cache::put($cacheKey, $coinData, 300);
        \Cache::put($metaKey, [
            'timestamp' => now()->toIso8601String(),
            'source' => 'coingecko'
        ], 300);
        
        Log::debug("Cached individual coin data", ['coin' => $coinData['id']]);
    }
    
    /**
     * Build market data from individual coin caches
     */
    private function buildFromIndividualCaches($ids)
    {
        $idArray = explode(',', $ids);
        $result = [];
        $missingCoins = [];
        
        foreach ($idArray as $coinId) {
            $coinId = trim($coinId);
            $cacheKey = "coin_data_{$coinId}";
            $cachedCoin = \Cache::get($cacheKey);
            
            if ($cachedCoin) {
                $result[] = $cachedCoin;
                Log::debug("Retrieved coin from individual cache", ['coin' => $coinId]);
            } else {
                $missingCoins[] = $coinId;
            }
        }
        
        // If we have some missing coins, try alternative sources
        if (!empty($missingCoins)) {
            Log::info("Missing coins from cache", ['coins' => $missingCoins]);
            
            // Try to get missing coins from AlphaVantage for major cryptos
            $alphaVantageCoins = $this->tryAlphaVantageForCoins($missingCoins);
            if (!empty($alphaVantageCoins)) {
                $result = array_merge($result, $alphaVantageCoins);
            }
        }
        
        return $result;
    }
    
    /**
     * Try to get coin data from AlphaVantage for major cryptocurrencies
     */
    private function tryAlphaVantageForCoins($coinIds)
    {
        $result = [];
        
        // Mapping of CoinGecko IDs to AlphaVantage symbols
        $supportedCoins = [
            'bitcoin' => ['symbol' => 'BTC', 'name' => 'Bitcoin'],
            'ethereum' => ['symbol' => 'ETH', 'name' => 'Ethereum'],
            'litecoin' => ['symbol' => 'LTC', 'name' => 'Litecoin'],
            'ripple' => ['symbol' => 'XRP', 'name' => 'XRP'],
            'bitcoin-cash' => ['symbol' => 'BCH', 'name' => 'Bitcoin Cash']
        ];
        
        $alphaVantage = app(\App\Services\AlphaVantageService::class);
        
        foreach ($coinIds as $coinId) {
            if (isset($supportedCoins[$coinId])) {
                try {
                    $symbol = $supportedCoins[$coinId]['symbol'];
                    $exchangeRate = $alphaVantage->getCryptoExchangeRate($symbol, 'USD');
                    
                    if ($exchangeRate && isset($exchangeRate['data'])) {
                        // Convert AlphaVantage format to CoinGecko format
                        $coinData = $this->convertAlphaVantageToCoinGecko($coinId, $supportedCoins[$coinId], $exchangeRate['data']);
                        if ($coinData) {
                            $result[] = $coinData;
                            // Cache this data for future use
                            $this->cacheIndividualCoin($coinData);
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to get {$coinId} from AlphaVantage", ['error' => $e->getMessage()]);
                }
            }
        }
        
        return $result;
    }
    
    /**
     * Convert AlphaVantage data to CoinGecko format
     */
    private function convertAlphaVantageToCoinGecko($coinId, $coinInfo, $alphaData)
    {
        if (!isset($alphaData['Realtime Currency Exchange Rate'])) {
            return null;
        }
        
        $data = $alphaData['Realtime Currency Exchange Rate'];
        $price = floatval($data['5. Exchange Rate'] ?? 0);
        
        if ($price <= 0) {
            return null;
        }
        
        // Build CoinGecko-compatible structure with available data
        return [
            'id' => $coinId,
            'symbol' => strtolower($coinInfo['symbol']),
            'name' => $coinInfo['name'],
            'image' => $this->getCoinImage($coinId),
            'current_price' => $price,
            'market_cap' => null, // Not available from AlphaVantage
            'market_cap_rank' => null,
            'fully_diluted_valuation' => null,
            'total_volume' => null,
            'high_24h' => null,
            'low_24h' => null,
            'price_change_24h' => null,
            'price_change_percentage_24h' => 0, // Default to 0 if not available
            'price_change_percentage_7d' => 0,
            'price_change_percentage_30d' => 0,
            'price_change_percentage_90d' => 0,
            'circulating_supply' => null,
            'total_supply' => null,
            'max_supply' => null,
            'last_updated' => $data['6. Last Refreshed'] ?? now()->toIso8601String()
        ];
    }
    
    /**
     * Get coin image URL
     */
    private function getCoinImage($coinId)
    {
        $images = [
            'bitcoin' => 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            'ethereum' => 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            'litecoin' => 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
            'ripple' => 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
            'bitcoin-cash' => 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png'
        ];
        
        return $images[$coinId] ?? 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
    }
}