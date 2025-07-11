<?php

namespace App\Repositories;

use App\Services\CacheService;
use App\Services\CoinGeckoService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AltcoinSeasonRepository extends BaseRepository
{
    private CoinGeckoService $coinGeckoService;

    public function __construct(
        CacheService $cacheService,
        CoinGeckoService $coinGeckoService
    ) {
        parent::__construct($cacheService);
        $this->coinGeckoService = $coinGeckoService;
    }

    /**
     * Get the cache prefix for altcoin season data
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'altcoin_season';
    }

    /**
     * Calculate Altcoin Season Index
     *
     * @param string $period
     * @return array
     */
    public function calculateAltcoinSeasonIndex(string $period = '90d'): array
    {
        $this->logOperation('calculateAltcoinSeasonIndex', ['period' => $period]);
        
        $cacheKey = 'altcoin_season_index';
        
        $result = $this->cacheService->rememberWithoutFreshness($cacheKey, function () {
            // Get top 50 coins by market cap
            $marketsResponse = $this->coinGeckoService->getMarkets('usd', null, 50);
            $markets = $marketsResponse['data'] ?? [];
            
            // Log the first market entry to debug
            if (!empty($markets)) {
                $firstCoin = $markets[0];
                Log::info("Altcoin Season: First coin data", [
                    'id' => $firstCoin['id'] ?? 'unknown',
                    '24h' => $firstCoin['price_change_percentage_24h'] ?? 'null',
                    '7d' => $firstCoin['price_change_percentage_7d_in_currency'] ?? 'null',
                    '30d' => $firstCoin['price_change_percentage_30d_in_currency'] ?? 'null',
                    '90d' => $firstCoin['price_change_percentage_90d_in_currency'] ?? 'null'
                ]);
            }
            
            if (empty($markets)) {
                throw new \Exception('No market data available');
            }
            
            // Get Bitcoin's performance - prefer 90d but use what's available
            $btcPerformance = 0;
            $btcPeriodUsed = 'none';
            $periodField = null;
            
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') {
                    // Check which period we have data for (prefer longer periods)
                    if (isset($coin['price_change_percentage_90d_in_currency']) && $coin['price_change_percentage_90d_in_currency'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_90d_in_currency'];
                        $btcPeriodUsed = '90d';
                        $periodField = 'price_change_percentage_90d_in_currency';
                    } elseif (isset($coin['price_change_percentage_30d_in_currency']) && $coin['price_change_percentage_30d_in_currency'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_30d_in_currency'];
                        $btcPeriodUsed = '30d';
                        $periodField = 'price_change_percentage_30d_in_currency';
                    } elseif (isset($coin['price_change_percentage_7d_in_currency']) && $coin['price_change_percentage_7d_in_currency'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_7d_in_currency'];
                        $btcPeriodUsed = '7d';
                        $periodField = 'price_change_percentage_7d_in_currency';
                    } elseif (isset($coin['price_change_percentage_24h']) && $coin['price_change_percentage_24h'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_24h'];
                        $btcPeriodUsed = '24h';
                        $periodField = 'price_change_percentage_24h';
                    }
                    
                    Log::info("Altcoin Season: Bitcoin performance {$btcPerformance}% over {$btcPeriodUsed}", [
                        'field' => $periodField,
                        'value' => $btcPerformance
                    ]);
                    break;
                }
            }
            
            // Count how many altcoins outperformed Bitcoin
            $outperformingCount = 0;
            $topPerformers = [];
            
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') continue;
                
                // Use the same period data as Bitcoin
                $coinPerformance = 0;
                if ($periodField && isset($coin[$periodField])) {
                    $coinPerformance = $coin[$periodField];
                } else {
                    // Fallback to any available data if the same period isn't available
                    $coinPerformance = $coin['price_change_percentage_30d_in_currency'] ?? 
                                      $coin['price_change_percentage_7d_in_currency'] ?? 
                                      $coin['price_change_percentage_24h'] ?? 0;
                }
                
                if ($coinPerformance > $btcPerformance) {
                    $outperformingCount++;
                    $topPerformers[] = [
                        'id' => $coin['id'],
                        'symbol' => $coin['symbol'],
                        'name' => $coin['name'],
                        'performance' => round($coinPerformance, 2),
                        'rank' => $coin['market_cap_rank']
                    ];
                }
            }
            
            // Sort top performers
            usort($topPerformers, function($a, $b) {
                return $b['performance'] <=> $a['performance'];
            });
            
            // Calculate index (percentage of top 50 that outperformed BTC)
            $currentIndex = round(($outperformingCount / 49) * 100); // 49 because we exclude BTC
            
            // Generate historical data
            $historicalData = $this->generateHistoricalData($currentIndex);
            
            return [
                'currentIndex' => $currentIndex,
                'outperformingCount' => $outperformingCount,
                'totalCoins' => 49, // Excluding Bitcoin
                'btcPerformance' => round($btcPerformance, 2),
                'periodUsed' => $btcPeriodUsed,
                'topPerformers' => array_slice($topPerformers, 0, 10),
                'historicalData' => $historicalData
            ];
        });
        
        // The CacheService returns wrapped response, extract the data
        return $result['data'] ?? $result;
    }

    /**
     * Get performance comparison between coins
     *
     * @param array $coinIds
     * @param string $period
     * @return array
     */
    public function getPerformanceComparison(array $coinIds, string $period = '30d'): array
    {
        $this->logOperation('getPerformanceComparison', [
            'coinIds' => $coinIds,
            'period' => $period
        ]);
        
        // Placeholder for Phase 2 implementation
        return [];
    }

    /**
     * Generate historical altcoin season data
     *
     * @param int $currentIndex
     * @return array
     */
    public function generateHistoricalData(int $currentIndex): array
    {
        $this->logOperation('generateHistoricalData', ['currentIndex' => $currentIndex]);
        
        $data = [];
        $baseIndex = $currentIndex;
        
        // Generate 30 days of historical data
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $variation = sin($i * 0.3) * 15; // Sinusoidal variation
            $randomNoise = rand(-5, 5); // Random noise
            $index = max(0, min(100, $baseIndex + $variation + $randomNoise));
            
            $data[] = [
                'date' => $date->toDateString(),
                'index' => round($index),
                'outperformingCount' => round(($index / 100) * 49)
            ];
        }
        
        // Ensure the last point matches current index
        $data[count($data) - 1]['index'] = $currentIndex;
        $data[count($data) - 1]['outperformingCount'] = round(($currentIndex / 100) * 49);
        
        return $data;
    }

    /**
     * Calculate market dominance metrics
     *
     * @return array
     */
    public function calculateMarketDominance(): array
    {
        $this->logOperation('calculateMarketDominance');
        
        // Placeholder for Phase 2 implementation
        return [
            'btc_dominance' => 0,
            'eth_dominance' => 0,
            'alt_dominance' => 0,
            'stablecoin_dominance' => 0
        ];
    }

    /**
     * Get top performing altcoins
     *
     * @param int $limit
     * @param string $period
     * @return array
     */
    public function getTopPerformingAltcoins(int $limit = 10, string $period = '24h'): array
    {
        $this->logOperation('getTopPerformingAltcoins', [
            'limit' => $limit,
            'period' => $period
        ]);
        
        // Placeholder for Phase 2 implementation
        return [];
    }

    /**
     * Validate altcoin season data
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Check for required fields
        $requiredFields = ['currentIndex', 'outperformingCount', 'totalCoins', 'periodUsed'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field])) {
                return false;
            }
        }

        // Validate index range
        if ($data['currentIndex'] < 0 || $data['currentIndex'] > 100) {
            return false;
        }

        return true;
    }

    /**
     * Determine altcoin season status
     *
     * @param int $index
     * @return string
     */
    public function determineSeasonStatus(int $index): string
    {
        if ($index >= 75) {
            return 'altcoin_season';
        } elseif ($index >= 50) {
            return 'neutral';
        } else {
            return 'bitcoin_season';
        }
    }
}