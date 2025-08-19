<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
// use App\Services\TradFiCorrelationService;
// use App\Services\MarketRegimeService;
// use App\Services\VolatilityForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ForecastController extends Controller
{
    private $tradFiService;
    private $regimeService;
    private $volatilityService;

    public function __construct(
        // TradFiCorrelationService $tradFiService,
        // MarketRegimeService $regimeService,
        // VolatilityForecastService $volatilityService
    ) {
        // $this->tradFiService = $tradFiService;
        // $this->regimeService = $regimeService;
        // $this->volatilityService = $volatilityService;
    }

    /**
     * Get correlation matrix for desktop heatmap
     * GET /api/crypto/forecast/correlation-matrix
     */
    public function correlationMatrix(): JsonResponse
    {
        try {
            $data = $this->tradFiService->getMultiAssetMatrix();
            
            // Add response headers for cache metadata
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('Correlation matrix endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load correlation data',
                'message' => 'Forecasting data temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Get current market regime status
     * GET /api/crypto/forecast/market-regime
     */
    public function marketRegime(): JsonResponse
    {
        try {
            $data = $this->regimeService->getCurrentMarketRegime();
            
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('Market regime endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load market regime data',
                'message' => 'Market regime analysis temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Get VIX-Bitcoin correlation data
     * GET /api/crypto/forecast/vix-correlation
     */
    public function vixCorrelation(): JsonResponse
    {
        try {
            $data = $this->tradFiService->getVIXBitcoinCorrelation();
            
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('VIX correlation endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load VIX correlation data',
                'message' => 'VIX correlation analysis temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Get volatility forecast for 24h and 7d periods
     * GET /api/crypto/forecast/volatility-forecast
     */
    public function volatilityForecast(): JsonResponse
    {
        try {
            $data = $this->volatilityService->getVolatilityForecast();
            
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('Volatility forecast endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load volatility forecast',
                'message' => 'Volatility forecasting temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Get volatility surface analysis
     * GET /api/crypto/forecast/volatility-surface
     */
    public function volatilitySurface(): JsonResponse
    {
        try {
            $data = $this->volatilityService->getVolatilitySurface();
            
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('Volatility surface endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load volatility surface',
                'message' => 'Volatility analysis temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Get DXY-Bitcoin correlation data
     * GET /api/crypto/forecast/dxy-correlation
     */
    public function dxyCorrelation(): JsonResponse
    {
        try {
            $data = $this->tradFiService->getDXYBitcoinCorrelation();
            
            return response()->json($data['data'] ?? $data)
                ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
                ->header('X-Cache-Age', $data['metadata']['age'] ?? 0)
                ->header('X-Last-Updated', $data['metadata']['timestamp'] ?? Carbon::now()->toISOString());
                
        } catch (\Exception $e) {
            Log::error('DXY correlation endpoint failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'error' => 'Unable to load DXY correlation data',
                'message' => 'DXY correlation analysis temporarily unavailable'
            ], 503);
        }
    }

    /**
     * Test endpoint to verify forecasting system status
     * GET /api/crypto/forecast/status
     */
    public function status(): JsonResponse
    {
        try {
            $status = [
                'system' => 'operational',
                'services' => [
                    'tradfi_correlations' => $this->testService('tradfi'),
                    'market_regime' => $this->testService('regime'),
                    'volatility_forecast' => $this->testService('volatility')
                ],
                'cache_status' => $this->getCacheStatus(),
                'last_updated' => Carbon::now()->toISOString()
            ];

            return response()->json($status);
            
        } catch (\Exception $e) {
            Log::error('Forecast status endpoint failed', ['error' => $e->getMessage()]);
            
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
                case 'tradfi':
                    $this->tradFiService->getMultiAssetMatrix();
                    return ['status' => 'operational', 'last_test' => Carbon::now()->toISOString()];
                    
                case 'regime':
                    $this->regimeService->getCurrentMarketRegime();
                    return ['status' => 'operational', 'last_test' => Carbon::now()->toISOString()];
                    
                case 'volatility':
                    $this->volatilityService->getVolatilityForecast();
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
     * Get cache status for forecasting data
     */
    private function getCacheStatus(): array
    {
        try {
            $cache = app('cache');
            
            $cacheKeys = [
                'forecast_correlation_matrix',
                'forecast_market_regime_current',
                'forecast_vix_bitcoin_correlation',
                'forecast_volatility_forecast'
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