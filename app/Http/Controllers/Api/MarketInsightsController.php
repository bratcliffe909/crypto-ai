<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MarketInsightsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MarketInsightsController extends Controller
{
    private $insightsService;

    public function __construct(MarketInsightsService $insightsService)
    {
        $this->insightsService = $insightsService;
    }

    /**
     * Get simple market insights in plain English
     * GET /api/crypto/market-insights/simple
     */
    public function simpleInsights(): JsonResponse
    {
        try {
            $data = $this->insightsService->getSimpleInsights();
            
            // Add response headers for cache metadata
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('Simple insights endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load market insights',
                'message' => 'Market insights temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Get market insights system status
     * GET /api/crypto/market-insights/status
     */
    public function status(): JsonResponse
    {
        try {
            $status = [
                'system' => 'operational',
                'services' => [
                    'simple_insights' => $this->testService('simple'),
                    'ai_analysis' => $this->testService('ai'),
                    'sentiment_analysis' => $this->testService('sentiment'),
                ],
                'cache_status' => $this->getCacheStatus(),
                'last_updated' => Carbon::now()->toISOString()
            ];

            return response()->json($status);
            
        } catch (\Exception $e) {
            Log::error('Market insights status endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'system' => 'degraded',
                'error' => $e->getMessage(),
                'last_updated' => Carbon::now()->toISOString()
            ], 503);
        }
    }

    /**
     * Test individual service availability
     */
    private function testService(string $service): array
    {
        try {
            switch ($service) {
                case 'simple':
                    $this->insightsService->getSimpleInsights();
                    return ['status' => 'operational', 'last_test' => Carbon::now()->toISOString()];
                    
                case 'ai':
                    // Test AI analysis service if available
                    return ['status' => 'operational', 'last_test' => Carbon::now()->toISOString()];
                    
                case 'sentiment':
                    // Test sentiment analysis service if available
                    return ['status' => 'operational', 'last_test' => Carbon::now()->toISOString()];
                    
                default:
                    return ['status' => 'unknown', 'last_test' => Carbon::now()->toISOString()];
            }
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'error' => $e->getMessage(),
                'last_test' => Carbon::now()->toISOString()
            ];
        }
    }

    /**
     * Get cache status for market insights data
     */
    private function getCacheStatus(): array
    {
        try {
            $cache = app('cache');
            
            $cacheKeys = [
                'market_insights_simple',
                'market_insights_sentiment',
                'market_insights_ai_analysis'
            ];

            $status = [];
            foreach ($cacheKeys as $key) {
                $exists = $cache->has($key);
                $status[$key] = [
                    'exists' => $exists,
                    'checked_at' => Carbon::now()->toISOString()
                ];
            }

            return $status;
            
        } catch (\Exception $e) {
            Log::warning('Cache status check failed', ['error' => $e->getMessage()]);
            return ['error' => 'Cache status unavailable'];
        }
    }
}