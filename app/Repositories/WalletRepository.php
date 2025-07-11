<?php

namespace App\Repositories;

use App\Services\CoinGeckoService;
use App\Services\CacheService;
use App\Services\WalletCacheService;
use Illuminate\Support\Facades\Log;

class WalletRepository extends BaseRepository
{
    private CoinGeckoService $coinGeckoService;
    private WalletCacheService $walletCacheService;

    public function __construct(
        CacheService $cacheService,
        CoinGeckoService $coinGeckoService,
        WalletCacheService $walletCacheService = null
    ) {
        parent::__construct($cacheService);
        $this->coinGeckoService = $coinGeckoService;
        $this->walletCacheService = $walletCacheService;
    }

    /**
     * Get the cache prefix for wallet data
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'wallet_data';
    }

    /**
     * Get coin data for wallet with full market data
     *
     * @param array $coinIds
     * @param string $vsCurrency
     * @return array
     */
    public function getWalletCoinsData(array $coinIds, string $vsCurrency = 'usd'): array
    {
        $this->logOperation('getWalletCoinsData', [
            'coinIds' => $coinIds,
            'vsCurrency' => $vsCurrency
        ]);

        if (empty($coinIds)) {
            return [
                'data' => [],
                'metadata' => [
                    'source' => 'none',
                    'cacheAge' => 0,
                    'lastUpdated' => now()->toIso8601String()
                ]
            ];
        }

        // Get full market data for wallet coins
        return $this->coinGeckoService->getSpecificCoinsMarketData($coinIds, $vsCurrency);
    }

    /**
     * Calculate portfolio metrics
     *
     * @param array $holdings - Array of holdings with structure: ['coinId' => ['balance' => float, 'cost_basis' => float]]
     * @param array $marketData - Market data from getWalletCoinsData
     * @return array
     */
    public function calculatePortfolioMetrics(array $holdings, array $marketData): array
    {
        $this->logOperation('calculatePortfolioMetrics', [
            'holdingsCount' => count($holdings),
            'marketDataCount' => count($marketData)
        ]);

        $totalValue = 0;
        $totalCost = 0;
        $total24hChange = 0;
        $coinAllocations = [];
        $coinMetrics = [];

        // Create a map of market data by coin ID for quick lookup
        $marketDataMap = [];
        foreach ($marketData as $coin) {
            if (isset($coin['id'])) {
                $marketDataMap[$coin['id']] = $coin;
            }
        }

        // Calculate metrics for each holding
        foreach ($holdings as $coinId => $holding) {
            $balance = $holding['balance'] ?? 0;
            $costBasis = $holding['cost_basis'] ?? null;
            
            if ($balance <= 0 || !isset($marketDataMap[$coinId])) {
                continue;
            }

            $coinData = $marketDataMap[$coinId];
            $currentPrice = $coinData['current_price'] ?? 0;
            $priceChange24h = $coinData['price_change_percentage_24h'] ?? 0;
            
            // Calculate coin value
            $coinValue = $balance * $currentPrice;
            $totalValue += $coinValue;
            
            // Calculate 24h change for this coin
            $previousPrice = $currentPrice / (1 + $priceChange24h / 100);
            $previousValue = $balance * $previousPrice;
            $coin24hChange = $coinValue - $previousValue;
            $total24hChange += $coin24hChange;
            
            // Calculate cost basis if available
            if ($costBasis !== null) {
                $coinCost = $balance * $costBasis;
                $totalCost += $coinCost;
                $profitLoss = $coinValue - $coinCost;
                $profitLossPercentage = $coinCost > 0 ? ($profitLoss / $coinCost) * 100 : 0;
            } else {
                $coinCost = null;
                $profitLoss = null;
                $profitLossPercentage = null;
            }

            $coinMetrics[$coinId] = [
                'id' => $coinId,
                'symbol' => $coinData['symbol'] ?? '',
                'name' => $coinData['name'] ?? '',
                'image' => $coinData['image'] ?? '',
                'balance' => $balance,
                'current_price' => $currentPrice,
                'value' => $coinValue,
                'cost_basis' => $costBasis,
                'total_cost' => $coinCost,
                'profit_loss' => $profitLoss,
                'profit_loss_percentage' => $profitLossPercentage,
                'price_change_24h' => $priceChange24h,
                'value_change_24h' => $coin24hChange,
                'market_cap_rank' => $coinData['market_cap_rank'] ?? null
            ];
        }

        // Calculate allocations
        foreach ($coinMetrics as $coinId => $metrics) {
            $allocation = $totalValue > 0 ? ($metrics['value'] / $totalValue) * 100 : 0;
            $coinAllocations[$coinId] = round($allocation, 2);
            $coinMetrics[$coinId]['allocation_percentage'] = round($allocation, 2);
        }

        // Calculate overall profit/loss
        $totalProfitLoss = $totalCost > 0 ? $totalValue - $totalCost : null;
        $totalProfitLossPercentage = $totalCost > 0 ? ($totalProfitLoss / $totalCost) * 100 : null;

        return [
            'total_value' => round($totalValue, 2),
            'total_cost' => $totalCost > 0 ? round($totalCost, 2) : null,
            'total_profit_loss' => $totalProfitLoss !== null ? round($totalProfitLoss, 2) : null,
            'total_profit_loss_percentage' => $totalProfitLossPercentage !== null ? round($totalProfitLossPercentage, 2) : null,
            'total_24h_change' => round($total24hChange, 2),
            'total_24h_change_percentage' => $totalValue > 0 ? round(($total24hChange / ($totalValue - $total24hChange)) * 100, 2) : 0,
            'coin_allocations' => $coinAllocations,
            'coin_metrics' => $coinMetrics,
            'last_updated' => now()->toIso8601String()
        ];
    }

    /**
     * Get historical portfolio value
     *
     * @param array $holdings
     * @param int $days
     * @param string $vsCurrency
     * @return array
     */
    public function getHistoricalPortfolioValue(array $holdings, int $days = 30, string $vsCurrency = 'usd'): array
    {
        $this->logOperation('getHistoricalPortfolioValue', [
            'holdingsCount' => count($holdings),
            'days' => $days,
            'vsCurrency' => $vsCurrency
        ]);

        if (empty($holdings)) {
            return [
                'labels' => [],
                'values' => [],
                'metadata' => [
                    'period' => $days . ' days',
                    'currency' => $vsCurrency
                ]
            ];
        }

        $labels = [];
        $values = [];
        $coinHistories = [];

        // Fetch historical data for each coin
        foreach ($holdings as $coinId => $holding) {
            $balance = $holding['balance'] ?? 0;
            if ($balance <= 0) {
                continue;
            }

            try {
                // Get historical prices for this coin
                $historicalData = $this->coinGeckoService->getMarketChart($coinId, $vsCurrency, $days);
                
                if (isset($historicalData['data']['prices']) && is_array($historicalData['data']['prices'])) {
                    $coinHistories[$coinId] = [
                        'balance' => $balance,
                        'prices' => $historicalData['data']['prices']
                    ];
                }
            } catch (\Exception $e) {
                $this->logOperation('getHistoricalPortfolioValue.error', [
                    'coinId' => $coinId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // If we have no historical data, return empty
        if (empty($coinHistories)) {
            return [
                'labels' => [],
                'values' => [],
                'metadata' => [
                    'period' => $days . ' days',
                    'currency' => $vsCurrency,
                    'error' => 'No historical data available'
                ]
            ];
        }

        // Create a unified timeline
        // Use the first coin's timestamps as reference
        $referenceTimestamps = [];
        foreach ($coinHistories as $history) {
            foreach ($history['prices'] as $pricePoint) {
                $referenceTimestamps[] = $pricePoint[0];
            }
            break; // Just use first coin for reference
        }

        // Sort timestamps
        sort($referenceTimestamps);

        // Calculate portfolio value at each timestamp
        foreach ($referenceTimestamps as $timestamp) {
            $portfolioValue = 0;
            $hasData = false;

            foreach ($coinHistories as $coinId => $history) {
                $balance = $history['balance'];
                
                // Find the price at this timestamp (or closest)
                $price = $this->findPriceAtTimestamp($history['prices'], $timestamp);
                if ($price !== null) {
                    $portfolioValue += $balance * $price;
                    $hasData = true;
                }
            }

            if ($hasData) {
                $labels[] = date('Y-m-d H:i', $timestamp / 1000);
                $values[] = round($portfolioValue, 2);
            }
        }

        // Reduce data points if too many (for performance)
        if (count($labels) > 100) {
            $step = ceil(count($labels) / 100);
            $labels = array_values(array_filter($labels, function($k) use ($step) {
                return $k % $step == 0;
            }, ARRAY_FILTER_USE_KEY));
            $values = array_values(array_filter($values, function($k) use ($step) {
                return $k % $step == 0;
            }, ARRAY_FILTER_USE_KEY));
        }

        return [
            'labels' => $labels,
            'values' => $values,
            'metadata' => [
                'period' => $days . ' days',
                'currency' => $vsCurrency,
                'data_points' => count($labels)
            ]
        ];
    }

    /**
     * Find price at specific timestamp from price array
     *
     * @param array $prices
     * @param int $timestamp
     * @return float|null
     */
    private function findPriceAtTimestamp(array $prices, int $timestamp): ?float
    {
        $closestPrice = null;
        $closestDiff = PHP_INT_MAX;

        foreach ($prices as $pricePoint) {
            $diff = abs($pricePoint[0] - $timestamp);
            if ($diff < $closestDiff) {
                $closestDiff = $diff;
                $closestPrice = $pricePoint[1];
            }
        }

        return $closestPrice;
    }

    /**
     * Batch fetch coin data with optimization
     *
     * @param array $coinIds
     * @param array $options
     * @return array
     */
    public function batchFetchCoinData(array $coinIds, array $options = []): array
    {
        $this->logOperation('batchFetchCoinData', [
            'coinCount' => count($coinIds),
            'options' => $options
        ]);

        if (empty($coinIds)) {
            return [
                'success' => true,
                'data' => [],
                'metadata' => [
                    'total_requested' => 0,
                    'total_found' => 0,
                    'batches' => 0
                ]
            ];
        }

        $vsCurrency = $options['vs_currency'] ?? 'usd';
        $batchSize = $options['batch_size'] ?? 50; // CoinGecko limit
        $results = [];
        $totalRequested = count($coinIds);
        $totalFound = 0;
        $batches = 0;

        // Process in batches
        $chunks = array_chunk($coinIds, $batchSize);

        foreach ($chunks as $chunk) {
            $batches++;
            
            try {
                $response = $this->coinGeckoService->getSpecificCoinsMarketData($chunk, $vsCurrency);
                
                if ($response['success'] && isset($response['data'])) {
                    foreach ($response['data'] as $coin) {
                        if (isset($coin['id'])) {
                            $results[$coin['id']] = $coin;
                            $totalFound++;
                        }
                    }
                }

                // Add delay between batches to avoid rate limits
                if (count($chunks) > 1 && $batches < count($chunks)) {
                    usleep(500000); // 0.5 second delay
                }

            } catch (\Exception $e) {
                $this->logOperation('batchFetchCoinData.error', [
                    'batch' => $batches,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'success' => $totalFound > 0,
            'data' => $results,
            'metadata' => [
                'total_requested' => $totalRequested,
                'total_found' => $totalFound,
                'batches' => $batches,
                'currency' => $vsCurrency
            ]
        ];
    }

    /**
     * Validate wallet data structure
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Check if it's price data format
        foreach ($data as $coinId => $coinData) {
            if (!is_array($coinData) || !isset($coinData['usd'])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Format coin data for wallet display
     *
     * @param array $marketData - Full market data from getWalletCoinsData
     * @param array $holdings - User holdings
     * @return array
     */
    public function formatWalletData(array $marketData, array $holdings): array
    {
        $this->logOperation('formatWalletData', [
            'marketDataCount' => count($marketData),
            'holdingsCount' => count($holdings)
        ]);

        $formatted = [];
        $totalValue = 0;
        $total24hChange = 0;
        
        // Create a map of market data by coin ID
        $marketDataMap = [];
        foreach ($marketData as $coin) {
            if (isset($coin['id'])) {
                $marketDataMap[$coin['id']] = $coin;
            }
        }
        
        foreach ($holdings as $coinId => $holding) {
            $balance = $holding['balance'] ?? 0;
            
            if ($balance <= 0) {
                continue;
            }
            
            // Get market data for this coin
            $coinData = $marketDataMap[$coinId] ?? null;
            
            if (!$coinData) {
                // Add placeholder for missing data
                $formatted[] = [
                    'id' => $coinId,
                    'symbol' => $holding['symbol'] ?? strtoupper(substr($coinId, 0, 3)),
                    'name' => $holding['name'] ?? ucfirst(str_replace('-', ' ', $coinId)),
                    'image' => $holding['image'] ?? null,
                    'balance' => $balance,
                    'current_price' => 0,
                    'value' => 0,
                    'price_change_24h' => 0,
                    'price_change_percentage_24h' => 0,
                    'market_cap_rank' => null,
                    'sparkline_in_7d' => null,
                    'needs_refresh' => true
                ];
                continue;
            }
            
            $currentPrice = $coinData['current_price'] ?? 0;
            $priceChange24h = $coinData['price_change_percentage_24h'] ?? 0;
            $value = $balance * $currentPrice;
            
            // Calculate 24h change in value
            $previousPrice = $currentPrice / (1 + $priceChange24h / 100);
            $previousValue = $balance * $previousPrice;
            $valueChange24h = $value - $previousValue;
            
            $totalValue += $value;
            $total24hChange += $valueChange24h;
            
            $formatted[] = [
                'id' => $coinId,
                'symbol' => $coinData['symbol'] ?? '',
                'name' => $coinData['name'] ?? '',
                'image' => $coinData['image'] ?? null,
                'balance' => $balance,
                'current_price' => $currentPrice,
                'value' => round($value, 2),
                'price_change_24h' => $coinData['price_change_24h'] ?? 0,
                'price_change_percentage_24h' => $priceChange24h,
                'value_change_24h' => round($valueChange24h, 2),
                'market_cap' => $coinData['market_cap'] ?? 0,
                'market_cap_rank' => $coinData['market_cap_rank'] ?? null,
                'total_volume' => $coinData['total_volume'] ?? 0,
                'high_24h' => $coinData['high_24h'] ?? 0,
                'low_24h' => $coinData['low_24h'] ?? 0,
                'sparkline_in_7d' => $coinData['sparkline_in_7d'] ?? null,
                'last_updated' => $coinData['last_updated'] ?? null,
                'needs_refresh' => false
            ];
        }
        
        // Sort by value descending
        usort($formatted, function($a, $b) {
            return $b['value'] <=> $a['value'];
        });

        return [
            'coins' => $formatted,
            'summary' => [
                'total_value' => round($totalValue, 2),
                'total_24h_change' => round($total24hChange, 2),
                'total_24h_change_percentage' => $totalValue > 0 ? round(($total24hChange / ($totalValue - $total24hChange)) * 100, 2) : 0,
                'coin_count' => count($formatted),
                'last_updated' => now()->toIso8601String()
            ]
        ];
    }

    /**
     * Track a coin as being used in a wallet
     *
     * @param string $coinId
     * @return void
     */
    public function trackWalletCoin(string $coinId): void
    {
        if ($this->walletCacheService) {
            $this->walletCacheService->trackWalletCoin($coinId);
        }
    }

    /**
     * Track multiple coins as being used in wallets
     *
     * @param array $coinIds
     * @return void
     */
    public function trackWalletCoins(array $coinIds): void
    {
        foreach ($coinIds as $coinId) {
            $this->trackWalletCoin($coinId);
        }
    }

    /**
     * Get active wallet coin IDs
     *
     * @return array
     */
    public function getActiveWalletCoinIds(): array
    {
        if ($this->walletCacheService) {
            return $this->walletCacheService->getActiveWalletCoinIds();
        }
        return [];
    }

    /**
     * Update cache for all actively used wallet coins
     *
     * @return array
     */
    public function updateActiveWalletCache(): array
    {
        if ($this->walletCacheService) {
            return $this->walletCacheService->updateActiveWalletCache();
        }
        
        return [
            'total_coins' => 0,
            'updated' => 0,
            'failed' => 0,
            'coins' => []
        ];
    }

    /**
     * Get wallet coins with caching and tracking
     *
     * @param string $ids - Comma-separated coin IDs
     * @param string $vsCurrency
     * @return array
     */
    public function getWalletCoinsFromIds(string $ids, string $vsCurrency = 'usd'): array
    {
        $this->logOperation('getWalletCoinsFromIds', [
            'ids' => $ids,
            'vsCurrency' => $vsCurrency
        ]);
        
        // Track these coins as being used in wallets
        $coinIds = explode(',', $ids);
        foreach ($coinIds as $coinId) {
            $this->trackWalletCoin(trim($coinId));
        }
        
        // Use the wallet-specific method that always returns cache if available
        return $this->coinGeckoService->getWalletCoins($vsCurrency, $ids, 250);
    }
}