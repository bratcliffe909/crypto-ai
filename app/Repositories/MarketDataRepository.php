<?php

namespace App\Repositories;

use App\Services\CacheService;
use App\Services\CoinGeckoService;
use App\Services\WalletCacheService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class MarketDataRepository extends BaseRepository
{
    private CoinGeckoService $coinGeckoService;
    private WalletCacheService $walletCacheService;

    public function __construct(
        CacheService $cacheService,
        CoinGeckoService $coinGeckoService,
        WalletCacheService $walletCacheService
    ) {
        parent::__construct($cacheService);
        $this->coinGeckoService = $coinGeckoService;
        $this->walletCacheService = $walletCacheService;
    }

    /**
     * Get the cache prefix for market data
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'market_data';
    }

    /**
     * Get market overview data
     *
     * @param string $vsCurrency
     * @param string|null $ids
     * @param int $perPage
     * @return array
     */
    public function getMarketOverview(string $vsCurrency = 'usd', ?string $ids = null, int $perPage = 250): array
    {
        $this->logOperation('getMarketOverview', [
            'vsCurrency' => $vsCurrency,
            'ids' => $ids,
            'perPage' => $perPage
        ]);
        
        // Use cache-only method to avoid API calls from frontend
        return $this->coinGeckoService->getMarketsFromCache($vsCurrency, $ids, $perPage);
    }

    /**
     * Get simple price data for coins
     *
     * @param string $ids
     * @param string $vsCurrencies
     * @return array
     */
    public function getSimplePrice(string $ids, string $vsCurrencies = 'usd'): array
    {
        $this->logOperation('getSimplePrice', [
            'ids' => $ids,
            'vsCurrencies' => $vsCurrencies
        ]);
        
        return $this->coinGeckoService->getSimplePrice($ids, $vsCurrencies);
    }

    /**
     * Get trending coins
     *
     * @return array
     */
    public function getTrendingCoins(): array
    {
        $this->logOperation('getTrendingCoins');
        
        return $this->coinGeckoService->getTrending();
    }

    /**
     * Search for coins
     *
     * @param string $query
     * @return array
     */
    public function searchCoins(string $query): array
    {
        $this->logOperation('searchCoins', ['query' => $query]);
        
        return $this->coinGeckoService->searchCoins($query);
    }

    /**
     * Get wallet coins with tracking
     * Note: This delegates to WalletRepository for better separation of concerns
     *
     * @param string $ids
     * @param string $vsCurrency
     * @return array
     */
    public function getWalletCoins(string $ids, string $vsCurrency = 'usd'): array
    {
        $this->logOperation('getWalletCoins', [
            'ids' => $ids,
            'vsCurrency' => $vsCurrency
        ]);
        
        // Track these coins as being used in wallets
        $coinIds = explode(',', $ids);
        foreach ($coinIds as $coinId) {
            $this->walletCacheService->trackWalletCoin(trim($coinId));
        }
        
        // Use the wallet-specific method that always returns cache if available
        return $this->coinGeckoService->getWalletCoins($vsCurrency, $ids, 250);
    }

    /**
     * Refresh data for a specific coin
     *
     * @param string $coinId
     * @param string|null $symbol
     * @param string|null $name
     * @param string|null $image
     * @return array
     */
    public function refreshCoinData(string $coinId, ?string $symbol = null, ?string $name = null, ?string $image = null): array
    {
        $this->logOperation('refreshCoinData', [
            'coinId' => $coinId,
            'symbol' => $symbol,
            'name' => $name
        ]);
        
        try {
            // Track this coin as being used in wallet
            $this->walletCacheService->trackWalletCoin($coinId);
            
            // Force refresh the coin data
            $refreshed = $this->coinGeckoService->refreshCoinData($coinId, $symbol, $name, $image);
            
            if ($refreshed) {
                return [
                    'success' => true,
                    'message' => 'Coin data refreshed successfully'
                ];
            }
            
            // If refresh failed but we have placeholder data, still return success
            // The cron job will pick it up later
            if ($symbol && $name) {
                return [
                    'success' => true,
                    'message' => 'Coin added with placeholder data'
                ];
            }
            
            return [
                'success' => false,
                'message' => 'Failed to refresh coin data'
            ];
            
        } catch (\Exception $e) {
            Log::error('Refresh coin error', ['coinId' => $coinId, 'error' => $e->getMessage()]);
            
            return [
                'success' => false,
                'message' => 'Failed to refresh coin data',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get exchange rates
     *
     * @param string $base
     * @param string $symbols
     * @return array
     */
    public function getExchangeRates(string $base = 'USD', string $symbols = 'GBP,EUR,JPY,AUD,CAD'): array
    {
        $this->logOperation('getExchangeRates', [
            'base' => $base,
            'symbols' => $symbols
        ]);
        
        try {
            // For now, we'll use a simple cache with hardcoded rates
            // In production, you'd integrate with a proper exchange rate API
            $rates = Cache::remember("exchange_rates_{$base}", 3600, function () use ($base) {
                // Default rates relative to USD
                $baseRates = [
                    'USD' => 1.0,
                    'GBP' => 0.79,
                    'EUR' => 0.92,
                    'JPY' => 150.45,
                    'AUD' => 1.52,
                    'CAD' => 1.36
                ];
                
                if ($base !== 'USD' && isset($baseRates[$base])) {
                    // Convert rates to new base
                    $baseValue = $baseRates[$base];
                    $convertedRates = [];
                    foreach ($baseRates as $currency => $rate) {
                        $convertedRates[$currency] = $rate / $baseValue;
                    }
                    return $convertedRates;
                }
                
                return $baseRates;
            });
            
            // Filter to requested symbols
            $requestedSymbols = explode(',', $symbols);
            $filteredRates = array_intersect_key($rates, array_flip($requestedSymbols));
            
            return [
                'base' => $base,
                'date' => now()->toDateString(),
                'rates' => $filteredRates
            ];
            
        } catch (\Exception $e) {
            Log::error('Exchange rates error', ['error' => $e->getMessage()]);
            
            // Return default GBP rate as fallback
            return [
                'base' => 'USD',
                'date' => now()->toDateString(),
                'rates' => [
                    'GBP' => 0.79
                ]
            ];
        }
    }

    /**
     * Calculate market statistics
     *
     * @param array $marketData
     * @return array
     */
    public function calculateMarketStatistics(array $marketData): array
    {
        $this->logOperation('calculateMarketStatistics', [
            'dataCount' => count($marketData)
        ]);
        
        if (empty($marketData)) {
            return [
                'totalMarketCap' => 0,
                'totalVolume' => 0,
                'averageChange24h' => 0,
                'gainersCount' => 0,
                'losersCount' => 0
            ];
        }
        
        $totalMarketCap = 0;
        $totalVolume = 0;
        $changes = [];
        $gainers = 0;
        $losers = 0;
        
        foreach ($marketData as $coin) {
            $totalMarketCap += $coin['market_cap'] ?? 0;
            $totalVolume += $coin['total_volume'] ?? 0;
            
            if (isset($coin['price_change_percentage_24h'])) {
                $change = $coin['price_change_percentage_24h'];
                $changes[] = $change;
                
                if ($change > 0) {
                    $gainers++;
                } elseif ($change < 0) {
                    $losers++;
                }
            }
        }
        
        $averageChange = !empty($changes) ? array_sum($changes) / count($changes) : 0;
        
        return [
            'totalMarketCap' => $totalMarketCap,
            'totalVolume' => $totalVolume,
            'averageChange24h' => round($averageChange, 2),
            'gainersCount' => $gainers,
            'losersCount' => $losers
        ];
    }

    /**
     * Get top gainers and losers
     *
     * @param array $marketData
     * @param int $limit
     * @return array
     */
    public function getTopMovers(array $marketData, int $limit = 5): array
    {
        $this->logOperation('getTopMovers', [
            'dataCount' => count($marketData),
            'limit' => $limit
        ]);
        
        // Sort by 24h change
        usort($marketData, function($a, $b) {
            $changeA = $a['price_change_percentage_24h'] ?? 0;
            $changeB = $b['price_change_percentage_24h'] ?? 0;
            return $changeB <=> $changeA;
        });
        
        return [
            'gainers' => array_slice($marketData, 0, $limit),
            'losers' => array_slice($marketData, -$limit)
        ];
    }

    /**
     * Validate market data
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Check if it's market overview data
        if (isset($data[0]) && is_array($data[0])) {
            // Validate first item has required fields
            $requiredFields = ['id', 'symbol', 'name', 'current_price'];
            foreach ($requiredFields as $field) {
                if (!isset($data[0][$field])) {
                    return false;
                }
            }
            return true;
        }

        // Check if it's simple price data
        if (!empty($data) && is_array(reset($data))) {
            // Simple price format: {"bitcoin": {"usd": 12345}}
            return true;
        }

        return false;
    }
}