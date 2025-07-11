<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\AltcoinSeasonRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class AltcoinSeasonController extends Controller
{
    protected AltcoinSeasonRepository $altcoinSeasonRepository;

    public function __construct(AltcoinSeasonRepository $altcoinSeasonRepository)
    {
        $this->altcoinSeasonRepository = $altcoinSeasonRepository;
    }

    /**
     * Get altcoin season index data
     */
    public function index()
    {
        try {
            // Use repository to calculate altcoin season index
            $result = $this->altcoinSeasonRepository->calculateAltcoinSeasonIndex();
            
            // Format response with metadata
            return response()->json([
                'currentIndex' => $result['currentIndex'] ?? 0,
                'outperformingCount' => $result['outperformingCount'] ?? 0,
                'totalCoins' => $result['totalCoins'] ?? 49,
                'btcPerformance' => $result['btcPerformance'] ?? 0,
                'periodUsed' => $result['periodUsed'] ?? 'none',
                'topPerformers' => $result['topPerformers'] ?? [],
                'historicalData' => $result['historicalData'] ?? [],
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'repository'
            ]);
        } catch (\Exception $e) {
            Log::error('Altcoin Season calculation error', ['error' => $e->getMessage()]);
            
            return response()->json([
                'currentIndex' => 0,
                'outperformingCount' => 0,
                'totalCoins' => 49,
                'btcPerformance' => 0,
                'periodUsed' => 'none',
                'topPerformers' => [],
                'historicalData' => [],
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'error',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    // generateHistoricalData method moved to AltcoinSeasonRepository
    
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