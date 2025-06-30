<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SystemStatusController extends Controller
{
    /**
     * Get system status including cache and API health
     */
    public function index()
    {
        try {
            // Get cache statistics from the last hour
            $stats = Cache::get('system_stats', [
                'totalRequests' => 0,
                'cacheHits' => 0,
                'apiFailures' => 0,
                'rateLimits' => 0,
                'lastApiSuccess' => null,
                'lastCacheHit' => null,
                'apiProviders' => []
            ]);
            
            // Check if cache is working
            $cacheStatus = 'healthy'; // Default to healthy
            try {
                $testKey = 'cache_test_' . time();
                Cache::put($testKey, true, 1);
                $testValue = Cache::get($testKey);
                Cache::forget($testKey);
                
                if (!$testValue) {
                    $cacheStatus = 'unhealthy';
                }
            } catch (\Exception $e) {
                $cacheStatus = 'unhealthy';
                Log::error('Cache health check failed: ' . $e->getMessage());
            }
            
            // Determine API status based on recent failures and rate limits
            $apiStatus = 'unknown';
            $recentRequests = $stats['totalRequests'] - $stats['cacheHits'];
            
            if ($recentRequests > 0) {
                $failureRate = (($stats['apiFailures'] + $stats['rateLimits']) / $recentRequests) * 100;
                
                if ($failureRate <= 10) {
                    $apiStatus = 'healthy';
                } elseif ($failureRate <= 50) {
                    $apiStatus = 'degraded';
                } else {
                    $apiStatus = 'unhealthy';
                }
            } else if ($stats['totalRequests'] > 0) {
                // All requests are being served from cache
                $apiStatus = 'healthy';
            }
            
            // Check individual API providers
            $providers = [
                'coingecko' => $this->checkProviderStatus('coingecko'),
                'alphaVantage' => $this->checkProviderStatus('alpha_vantage'),
                'finnhub' => $this->checkProviderStatus('finnhub'),
                'alternative' => $this->checkProviderStatus('alternative')
            ];
            
            // If any provider is completely down, mark API as degraded at minimum
            $hasUnhealthyProvider = collect($providers)->contains('status', 'unhealthy');
            if ($hasUnhealthyProvider && $apiStatus === 'healthy') {
                $apiStatus = 'degraded';
            }
            
            return response()->json([
                'cache' => $cacheStatus,
                'api' => $apiStatus,
                'details' => [
                    'totalRequests' => $stats['totalRequests'],
                    'cacheHits' => $stats['cacheHits'],
                    'apiFailures' => $stats['apiFailures'],
                    'rateLimits' => $stats['rateLimits'],
                    'providers' => $providers,
                    'lastUpdated' => now()->toIso8601String()
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('System status check failed: ' . $e->getMessage());
            
            return response()->json([
                'cache' => 'unknown',
                'api' => 'unknown',
                'details' => [
                    'totalRequests' => 0,
                    'cacheHits' => 0,
                    'apiFailures' => 0,
                    'rateLimits' => 0,
                    'providers' => [],
                    'lastUpdated' => now()->toIso8601String()
                ]
            ]);
        }
    }
    
    /**
     * Check individual API provider status
     */
    private function checkProviderStatus($provider)
    {
        $key = "provider_stats_{$provider}";
        $stats = Cache::get($key, [
            'requests' => 0,
            'failures' => 0,
            'rateLimits' => 0,
            'lastSuccess' => null,
            'lastFailure' => null
        ]);
        
        if ($stats['requests'] === 0) {
            return [
                'status' => 'unknown',
                'requests' => 0,
                'failures' => 0
            ];
        }
        
        $failureRate = (($stats['failures'] + $stats['rateLimits']) / $stats['requests']) * 100;
        $status = 'healthy';
        
        if ($failureRate >= 90) {
            $status = 'unhealthy';
        } elseif ($failureRate >= 30) {
            $status = 'degraded';
        }
        
        // If last success was more than 5 minutes ago, consider it degraded
        if ($stats['lastSuccess'] && Carbon::parse($stats['lastSuccess'])->diffInMinutes(now()) > 5) {
            if ($status === 'healthy') {
                $status = 'degraded';
            }
        }
        
        return [
            'status' => $status,
            'requests' => $stats['requests'],
            'failures' => $stats['failures'] + $stats['rateLimits']
        ];
    }
}