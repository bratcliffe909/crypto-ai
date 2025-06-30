<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoinGeckoService;
use App\Services\CacheService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AltcoinSeasonController extends Controller
{
    protected $coinGecko;
    protected $cacheService;

    public function __construct(CoinGeckoService $coinGecko, CacheService $cacheService)
    {
        $this->coinGecko = $coinGecko;
        $this->cacheService = $cacheService;
    }

    /**
     * Get altcoin season index data
     */
    public function index()
    {
        $cacheKey = 'altcoin_season_index';
        
        $result = $this->cacheService->remember($cacheKey, 60, function () {
            // Get top 50 coins by market cap
            $marketsResponse = $this->coinGecko->getMarkets('usd', null, 50);
            $markets = $marketsResponse['data'] ?? [];
            
            if (empty($markets)) {
                throw new \Exception('No market data available');
            }
            
            // Get Bitcoin's 90-day performance from the market data
            $btcPerformance = 0;
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') {
                    // Use 90d if available, otherwise fall back to shorter periods
                    $btcPerformance = $coin['price_change_percentage_90d_in_currency'] ?? 
                                     $coin['price_change_percentage_30d_in_currency'] ?? 
                                     $coin['price_change_percentage_7d_in_currency'] ?? 
                                     $coin['price_change_percentage_24h'] ?? 0;
                    break;
                }
            }
            
            // Count how many altcoins outperformed Bitcoin
            $outperformingCount = 0;
            $topPerformers = [];
            
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') continue;
                
                // Use the same period data as Bitcoin (90d if available)
                $coinPerformance = $coin['price_change_percentage_90d_in_currency'] ?? 
                                  $coin['price_change_percentage_30d_in_currency'] ?? 
                                  $coin['price_change_percentage_7d_in_currency'] ?? 
                                  $coin['price_change_percentage_24h'] ?? 0;
                
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
}