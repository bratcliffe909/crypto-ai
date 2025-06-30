<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoinGeckoService;
use App\Services\CacheService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MarketMetricsController extends Controller
{
    protected $coinGecko;
    protected $cacheService;

    public function __construct(CoinGeckoService $coinGecko, CacheService $cacheService)
    {
        $this->coinGecko = $coinGecko;
        $this->cacheService = $cacheService;
    }

    /**
     * Get global market metrics
     */
    public function globalMetrics()
    {
        try {
            $result = $this->coinGecko->getGlobalData();
            
            if (empty($result['data']) || !isset($result['data']['data'])) {
                return response()->json([
                    'error' => 'No market data available',
                    'lastUpdated' => $result['metadata']['lastUpdated'] ?? now()->toIso8601String(),
                    'cacheAge' => $result['metadata']['cacheAge'] ?? 0,
                    'dataSource' => $result['metadata']['source'] ?? 'none'
                ], 200);
            }
            
            $data = $result['data']['data'];
            
            return response()->json([
                'totalMarketCap' => $data['total_market_cap']['usd'] ?? 0,
                'totalMarketCapChange24h' => $data['market_cap_change_percentage_24h_usd'] ?? 0,
                'totalVolume' => $data['total_volume']['usd'] ?? 0,
                'marketCapPercentage' => [
                    'btc' => $data['market_cap_percentage']['btc'] ?? 0,
                    'eth' => $data['market_cap_percentage']['eth'] ?? 0,
                    'others' => $this->calculateOthersPercentage($data['market_cap_percentage'] ?? [])
                ],
                'activeCryptocurrencies' => $data['active_cryptocurrencies'] ?? 0,
                'markets' => $data['markets'] ?? 0,
                'defiMarketCap' => $data['defi_market_cap'] ?? null,
                'defiToTotalMarketCapRatio' => $data['defi_to_total_market_cap_ratio'] ?? null,
                'lastUpdated' => $result['metadata']['lastUpdated'],
                'cacheAge' => $result['metadata']['cacheAge'],
                'dataSource' => $result['metadata']['source']
            ]);
            
        } catch (\Exception $e) {
            Log::error('Global metrics error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to fetch global metrics',
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'none'
            ], 200);
        }
    }
    
    /**
     * Get market breadth data (gainers vs losers)
     */
    public function marketBreadth()
    {
        try {
            // Get top 250 coins to analyze market breadth
            $result = $this->coinGecko->getMarkets('usd', null, 250);
            $markets = $result['data'] ?? [];
            
            if (empty($markets)) {
                return response()->json([
                    'error' => 'No market data available',
                    'lastUpdated' => $result['metadata']['lastUpdated'] ?? now()->toIso8601String(),
                    'cacheAge' => $result['metadata']['cacheAge'] ?? 0,
                    'dataSource' => $result['metadata']['source'] ?? 'none'
                ], 200);
            }
            
            $gainers = 0;
            $losers = 0;
            $unchanged = 0;
            $totalVolume24h = 0;
            $topGainers = [];
            $topLosers = [];
            
            foreach ($markets as $coin) {
                $change24h = $coin['price_change_percentage_24h'] ?? 0;
                $totalVolume24h += $coin['total_volume'] ?? 0;
                
                if ($change24h > 0) {
                    $gainers++;
                    // Track top 5 gainers
                    if (count($topGainers) < 5) {
                        $topGainers[] = [
                            'symbol' => strtoupper($coin['symbol']),
                            'name' => $coin['name'],
                            'change' => $change24h,
                            'price' => $coin['current_price']
                        ];
                    }
                } elseif ($change24h < 0) {
                    $losers++;
                    // Track top 5 losers
                    if (count($topLosers) < 5) {
                        $topLosers[] = [
                            'symbol' => strtoupper($coin['symbol']),
                            'name' => $coin['name'],
                            'change' => $change24h,
                            'price' => $coin['current_price']
                        ];
                    }
                } else {
                    $unchanged++;
                }
            }
            
            // Sort gainers and losers
            usort($topGainers, function($a, $b) {
                return $b['change'] <=> $a['change'];
            });
            
            usort($topLosers, function($a, $b) {
                return $a['change'] <=> $b['change'];
            });
            
            $total = $gainers + $losers + $unchanged;
            $breadthRatio = $total > 0 ? ($gainers / $total) * 100 : 50;
            
            // Calculate market sentiment score (0-100)
            $sentimentScore = $this->calculateSentimentScore($breadthRatio, $gainers, $losers);
            
            return response()->json([
                'breadth' => [
                    'gainers' => $gainers,
                    'losers' => $losers,
                    'unchanged' => $unchanged,
                    'total' => $total,
                    'gainersPercentage' => round($breadthRatio, 2),
                    'losersPercentage' => round(($losers / $total) * 100, 2)
                ],
                'sentimentScore' => $sentimentScore,
                'sentiment' => $this->getSentimentLabel($sentimentScore),
                'topGainers' => array_slice($topGainers, 0, 5),
                'topLosers' => array_slice($topLosers, 0, 5),
                'totalVolume24h' => $totalVolume24h,
                'lastUpdated' => $result['metadata']['lastUpdated'],
                'cacheAge' => $result['metadata']['cacheAge'],
                'dataSource' => $result['metadata']['source']
            ]);
            
        } catch (\Exception $e) {
            Log::error('Market breadth error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to fetch market breadth',
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'none'
            ], 200);
        }
    }
    
    /**
     * Get volatility metrics
     */
    public function volatilityMetrics()
    {
        try {
            // Get top 10 coins for volatility analysis
            $result = $this->coinGecko->getMarkets('usd', null, 10);
            $markets = $result['data'] ?? [];
            
            if (empty($markets)) {
                return response()->json([
                    'error' => 'No market data available',
                    'lastUpdated' => $result['metadata']['lastUpdated'] ?? now()->toIso8601String(),
                    'cacheAge' => $result['metadata']['cacheAge'] ?? 0,
                    'dataSource' => $result['metadata']['source'] ?? 'none'
                ], 200);
            }
            
            $volatilityData = [];
            
            foreach ($markets as $coin) {
                $volatilityData[] = [
                    'symbol' => strtoupper($coin['symbol']),
                    'name' => $coin['name'],
                    'price' => $coin['current_price'],
                    'change24h' => $coin['price_change_percentage_24h'] ?? 0,
                    'high24h' => $coin['high_24h'] ?? 0,
                    'low24h' => $coin['low_24h'] ?? 0,
                    'volatility' => $this->calculateVolatility($coin),
                    'volume' => $coin['total_volume'] ?? 0
                ];
            }
            
            // Sort by volatility
            usort($volatilityData, function($a, $b) {
                return $b['volatility'] <=> $a['volatility'];
            });
            
            return response()->json([
                'coins' => $volatilityData,
                'averageVolatility' => round(array_sum(array_column($volatilityData, 'volatility')) / count($volatilityData), 2),
                'lastUpdated' => $result['metadata']['lastUpdated'],
                'cacheAge' => $result['metadata']['cacheAge'],
                'dataSource' => $result['metadata']['source']
            ]);
            
        } catch (\Exception $e) {
            Log::error('Volatility metrics error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to fetch volatility metrics',
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'none'
            ], 200);
        }
    }
    
    /**
     * Calculate others percentage for market dominance
     */
    private function calculateOthersPercentage($percentages)
    {
        $btc = $percentages['btc'] ?? 0;
        $eth = $percentages['eth'] ?? 0;
        $others = 100 - $btc - $eth;
        
        return round($others, 2);
    }
    
    /**
     * Calculate market sentiment score based on breadth
     */
    private function calculateSentimentScore($breadthRatio, $gainers, $losers)
    {
        // Base score from breadth ratio (0-100)
        $score = $breadthRatio;
        
        // Adjust based on extremes
        if ($gainers > $losers * 2) {
            $score = min(100, $score + 10); // Very bullish
        } elseif ($losers > $gainers * 2) {
            $score = max(0, $score - 10); // Very bearish
        }
        
        return round($score);
    }
    
    /**
     * Get sentiment label based on score
     */
    private function getSentimentLabel($score)
    {
        if ($score >= 80) return 'Extreme Greed';
        if ($score >= 65) return 'Greed';
        if ($score >= 50) return 'Neutral';
        if ($score >= 35) return 'Fear';
        return 'Extreme Fear';
    }
    
    /**
     * Calculate simple volatility metric
     */
    private function calculateVolatility($coin)
    {
        $high = $coin['high_24h'] ?? 0;
        $low = $coin['low_24h'] ?? 0;
        $current = $coin['current_price'] ?? 0;
        
        if ($current == 0) return 0;
        
        // Simple volatility calculation: (high - low) / current * 100
        $volatility = (($high - $low) / $current) * 100;
        
        return round($volatility, 2);
    }
}