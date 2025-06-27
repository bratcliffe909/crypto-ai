<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CoinGeckoService;

class MarketDataController extends Controller
{
    private CoinGeckoService $coinGeckoService;
    
    public function __construct(CoinGeckoService $coinGeckoService)
    {
        $this->coinGeckoService = $coinGeckoService;
    }

    /**
     * Get market data for cryptocurrencies
     */
    public function index(Request $request)
    {
        $vsCurrency = $request->get('vs_currency', 'usd');
        $ids = $request->get('ids');
        $perPage = $request->get('per_page', 250); // Maximum allowed by CoinGecko free tier
        
        $data = $this->coinGeckoService->getMarkets($vsCurrency, $ids, $perPage);
        
        return response()->json($data);
    }

    /**
     * Get simple price data
     */
    public function price(Request $request, $ids)
    {
        $vsCurrencies = $request->get('vs_currencies', 'usd');
        
        $data = $this->coinGeckoService->getSimplePrice($ids, $vsCurrencies);
        
        return response()->json($data);
    }

    /**
     * Get trending coins
     */
    public function trending()
    {
        $data = $this->coinGeckoService->getTrending();
        
        return response()->json($data);
    }

    /**
     * Search coins
     */
    public function search(Request $request)
    {
        $query = $request->get('q');
        
        if (!$query) {
            return response()->json(['error' => 'Query parameter is required'], 400);
        }
        
        $data = $this->coinGeckoService->searchCoins($query);
        
        return response()->json($data);
    }
    
    /**
     * Get exchange rates
     */
    public function exchangeRates(Request $request)
    {
        $base = $request->get('base', 'USD');
        $symbols = $request->get('symbols', 'GBP,EUR,JPY,AUD,CAD');
        
        try {
            // For now, we'll use a simple cache with hardcoded rates
            // In production, you'd integrate with a proper exchange rate API
            $rates = \Cache::remember("exchange_rates_{$base}", 3600, function () use ($base) {
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
            
            return response()->json([
                'base' => $base,
                'date' => now()->toDateString(),
                'rates' => $filteredRates
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Exchange rates error', ['error' => $e->getMessage()]);
            
            // Return default GBP rate as fallback
            return response()->json([
                'base' => 'USD',
                'date' => now()->toDateString(),
                'rates' => [
                    'GBP' => 0.79
                ]
            ]);
        }
    }
}
