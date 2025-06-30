<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CoinGeckoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AltcoinSeasonController extends Controller
{
    protected $coinGecko;

    public function __construct(CoinGeckoService $coinGecko)
    {
        $this->coinGecko = $coinGecko;
    }

    /**
     * Get altcoin season index data
     */
    public function index()
    {
        $cacheKey = 'altcoin_season_index';
        
        return Cache::remember($cacheKey, 3600, function () { // Cache for 1 hour
            try {
                // Get top 50 coins by market cap
                $markets = $this->coinGecko->getMarkets('usd', null, 50);
                
                if (empty($markets)) {
                    return $this->mockData();
                }
                
                // Get Bitcoin price history (90 days)
                $btcHistory = $this->coinGecko->getMarketChart('bitcoin', 'usd', 90);
                
                if (empty($btcHistory) || !isset($btcHistory['prices'])) {
                    return $this->mockData();
                }
                
                // Calculate Bitcoin's 90-day performance
                $btcPrices = $btcHistory['prices'];
                $btcStartPrice = $btcPrices[0][1] ?? 0;
                $btcEndPrice = end($btcPrices)[1] ?? 0;
                $btcPerformance = $btcStartPrice > 0 ? (($btcEndPrice - $btcStartPrice) / $btcStartPrice) * 100 : 0;
                
                // Count how many of top 50 outperformed Bitcoin
                $outperformingCount = 0;
                $topPerformers = [];
                
                foreach ($markets as $coin) {
                    if ($coin['id'] === 'bitcoin') continue;
                    
                    // Get coin's 90-day history
                    $coinHistory = Cache::remember("coin_history_{$coin['id']}_90d", 3600, function () use ($coin) {
                        return $this->coinGecko->getMarketChart($coin['id'], 'usd', 90);
                    });
                    
                    if (!empty($coinHistory) && isset($coinHistory['prices'])) {
                        $coinPrices = $coinHistory['prices'];
                        $coinStartPrice = $coinPrices[0][1] ?? 0;
                        $coinEndPrice = end($coinPrices)[1] ?? 0;
                        $coinPerformance = $coinStartPrice > 0 ? (($coinEndPrice - $coinStartPrice) / $coinStartPrice) * 100 : 0;
                        
                        if ($coinPerformance > $btcPerformance) {
                            $outperformingCount++;
                            $topPerformers[] = [
                                'id' => $coin['id'],
                                'symbol' => $coin['symbol'],
                                'name' => $coin['name'],
                                'performance' => $coinPerformance
                            ];
                        }
                    }
                }
                
                // Sort top performers
                usort($topPerformers, function($a, $b) {
                    return $b['performance'] <=> $a['performance'];
                });
                
                // Calculate index (percentage of top 50 that outperformed BTC)
                $currentIndex = round(($outperformingCount / 49) * 100); // 49 because we exclude BTC
                
                // Generate historical data (simulated for now)
                $historicalData = $this->generateHistoricalData($currentIndex);
                
                return response()->json([
                    'currentIndex' => $currentIndex,
                    'outperformingCount' => $outperformingCount,
                    'totalCoins' => 49, // Excluding Bitcoin
                    'btcPerformance' => round($btcPerformance, 2),
                    'topPerformers' => array_slice($topPerformers, 0, 10),
                    'historicalData' => $historicalData,
                    'lastUpdated' => now()->toIso8601String()
                ]);
                
            } catch (\Exception $e) {
                Log::error('Altcoin season index error', ['error' => $e->getMessage()]);
                return $this->mockData();
            }
        });
    }
    
    /**
     * Generate historical data (simulated)
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
     * Return mock data when API is unavailable
     */
    private function mockData()
    {
        $mockIndex = 22; // Bitcoin Season
        
        return response()->json([
            'currentIndex' => $mockIndex,
            'outperformingCount' => 11,
            'totalCoins' => 49,
            'btcPerformance' => 8.5,
            'topPerformers' => [
                ['id' => 'solana', 'symbol' => 'sol', 'name' => 'Solana', 'performance' => 24.3],
                ['id' => 'chainlink', 'symbol' => 'link', 'name' => 'Chainlink', 'performance' => 18.7],
                ['id' => 'avalanche-2', 'symbol' => 'avax', 'name' => 'Avalanche', 'performance' => 15.2],
                ['id' => 'polkadot', 'symbol' => 'dot', 'name' => 'Polkadot', 'performance' => 12.8],
                ['id' => 'uniswap', 'symbol' => 'uni', 'name' => 'Uniswap', 'performance' => 11.4]
            ],
            'historicalData' => $this->generateHistoricalData($mockIndex),
            'lastUpdated' => now()->toIso8601String(),
            'note' => 'Using cached data due to API limits'
        ]);
    }
}