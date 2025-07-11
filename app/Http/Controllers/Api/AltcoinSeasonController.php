<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoinGeckoService;
use App\Services\CacheService;
use App\Services\CryptoCompareService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class AltcoinSeasonController extends Controller
{
    protected $coinGecko;
    protected $cacheService;
    protected $cryptoCompare;

    public function __construct(CoinGeckoService $coinGecko, CacheService $cacheService, CryptoCompareService $cryptoCompare)
    {
        $this->coinGecko = $coinGecko;
        $this->cacheService = $cacheService;
        $this->cryptoCompare = $cryptoCompare;
    }

    /**
     * Get altcoin season index data
     */
    public function index()
    {
        $cacheKey = 'altcoin_season_index';
        
        $result = $this->cacheService->rememberWithoutFreshness($cacheKey, function () {
            // Get top 50 coins by market cap
            $marketsResponse = $this->coinGecko->getMarkets('usd', null, 50);
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
            
            // Generate historical data (simulated for now - should be calculated from historical data)
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
        
        // Format response
        return response()->json([
            'currentIndex' => $result['data']['currentIndex'] ?? 0,
            'outperformingCount' => $result['data']['outperformingCount'] ?? 0,
            'totalCoins' => $result['data']['totalCoins'] ?? 49,
            'btcPerformance' => $result['data']['btcPerformance'] ?? 0,
            'topPerformers' => $result['data']['topPerformers'] ?? [],
            'historicalData' => $result['data']['historicalData'] ?? [],
            'lastUpdated' => $result['metadata']['lastUpdated'],
            'cacheAge' => $result['metadata']['cacheAge'],
            'dataSource' => $result['metadata']['source']
        ]);
    }
    
    /**
     * Generate historical data (temporary until we implement proper historical tracking)
     */
    private function generateHistoricalData($currentIndex)
    {
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
     * Calculate 90-day performance for a specific coin using market chart data
     */
    private function calculate90DayPerformance($coinId)
    {
        try {
            // Get 91 days of data to ensure we have exactly 90 days ago
            $response = Http::timeout(10)->get("https://api.coingecko.com/api/v3/coins/{$coinId}/market_chart", [
                'vs_currency' => 'usd',
                'days' => 91,
                'interval' => 'daily'
            ]);
            
            if ($response->successful()) {
                $chartData = $response->json();
                
                if (isset($chartData['prices']) && count($chartData['prices']) > 90) {
                    $prices = $chartData['prices'];
                    
                    // Get price from 90 days ago (should be first or second entry)
                    $price90DaysAgo = $prices[0][1] ?? null;
                    
                    // Get current price (last price)
                    $currentPrice = $prices[count($prices) - 1][1] ?? null;
                    
                    if ($price90DaysAgo && $currentPrice && $price90DaysAgo > 0) {
                        // Calculate percentage change
                        $change90d = (($currentPrice - $price90DaysAgo) / $price90DaysAgo) * 100;
                        return round($change90d, 2);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to calculate 90-day performance for {$coinId}", ['error' => $e->getMessage()]);
        }
        
        return null;
    }
}