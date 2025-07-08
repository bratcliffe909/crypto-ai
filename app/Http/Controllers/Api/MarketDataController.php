<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CoinGeckoService;
use App\Services\WalletCacheService;
use Illuminate\Support\Facades\Log;

class MarketDataController extends Controller
{
    private CoinGeckoService $coinGeckoService;
    private WalletCacheService $walletCacheService;
    
    public function __construct(CoinGeckoService $coinGeckoService, WalletCacheService $walletCacheService)
    {
        $this->coinGeckoService = $coinGeckoService;
        $this->walletCacheService = $walletCacheService;
    }

    /**
     * Get market data for cryptocurrencies - reads from cache only
     */
    public function index(Request $request)
    {
        $vsCurrency = $request->get('vs_currency', 'usd');
        $ids = $request->get('ids');
        $perPage = $request->get('per_page', 250); // Maximum allowed by CoinGecko free tier
        
        // Use cache-only method to avoid API calls from frontend
        $result = $this->coinGeckoService->getMarketsFromCache($vsCurrency, $ids, $perPage);
        
        // Return the actual data array for backward compatibility
        return response()->json($result['data'] ?? [])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
    }

    /**
     * Get simple price data
     */
    public function price(Request $request, $ids)
    {
        $vsCurrencies = $request->get('vs_currencies', 'usd');
        
        $result = $this->coinGeckoService->getSimplePrice($ids, $vsCurrencies);
        
        return response()->json($result['data'] ?? [])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
    }

    /**
     * Get trending coins
     */
    public function trending()
    {
        $result = $this->coinGeckoService->getTrending();
        
        return response()->json($result['data'] ?? [])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
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
        
        $result = $this->coinGeckoService->searchCoins($query);
        
        return response()->json($result['data'] ?? [])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
    }
    
    /**
     * Get specific coins by IDs for wallet
     */
    public function walletCoins(Request $request)
    {
        $ids = $request->get('ids');
        
        if (!$ids) {
            return response()->json([]);
        }
        
        // Track these coins as being used in wallets
        $coinIds = explode(',', $ids);
        foreach ($coinIds as $coinId) {
            $this->walletCacheService->trackWalletCoin(trim($coinId));
        }
        
        // Use the wallet-specific method that always returns cache if available
        $result = $this->coinGeckoService->getWalletCoins('usd', $ids, 250);
        
        return response()->json($result['data'] ?? [])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
    }
    
    /**
     * Refresh data for a specific coin - used when adding new coins to wallet
     */
    public function refreshCoin(Request $request, $coinId)
    {
        try {
            // Track this coin as being used in wallet
            $this->walletCacheService->trackWalletCoin($coinId);
            
            // Force refresh the coin data
            $refreshed = $this->coinGeckoService->refreshCoinData($coinId);
            
            if ($refreshed) {
                return response()->json([
                    'success' => true,
                    'message' => 'Coin data refreshed successfully'
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to refresh coin data'
            ], 500);
            
        } catch (\Exception $e) {
            \Log::error('Refresh coin error', ['coinId' => $coinId, 'error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to refresh coin data',
                'error' => $e->getMessage()
            ], 500);
        }
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
