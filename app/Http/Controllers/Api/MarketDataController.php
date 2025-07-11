<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Repositories\MarketDataRepository;
use Illuminate\Support\Facades\Log;

class MarketDataController extends Controller
{
    private MarketDataRepository $marketDataRepository;
    
    public function __construct(MarketDataRepository $marketDataRepository)
    {
        $this->marketDataRepository = $marketDataRepository;
    }

    /**
     * Get market data for cryptocurrencies - reads from cache only
     */
    public function index(Request $request)
    {
        $vsCurrency = $request->get('vs_currency', 'usd');
        $ids = $request->get('ids');
        $perPage = $request->get('per_page', 250); // Maximum allowed by CoinGecko free tier
        
        // Use repository to get market overview
        $result = $this->marketDataRepository->getMarketOverview($vsCurrency, $ids, $perPage);
        
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
        
        $result = $this->marketDataRepository->getSimplePrice($ids, $vsCurrencies);
        
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
        $result = $this->marketDataRepository->getTrendingCoins();
        
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
        
        $result = $this->marketDataRepository->searchCoins($query);
        
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
        
        // Use repository to get wallet coins with tracking
        $result = $this->marketDataRepository->getWalletCoins($ids, 'usd');
        
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
        // Get placeholder data from request
        $symbol = $request->input('symbol');
        $name = $request->input('name');
        $image = $request->input('image');
        
        // Use repository to refresh coin data
        $result = $this->marketDataRepository->refreshCoinData($coinId, $symbol, $name, $image);
        
        if ($result['success']) {
            return response()->json($result);
        }
        
        return response()->json($result, 500);
    }
    
    /**
     * Get exchange rates
     */
    public function exchangeRates(Request $request)
    {
        $base = $request->get('base', 'USD');
        $symbols = $request->get('symbols', 'GBP,EUR,JPY,AUD,CAD');
        
        // Use repository to get exchange rates
        $result = $this->marketDataRepository->getExchangeRates($base, $symbols);
        
        return response()->json($result);
    }
}
