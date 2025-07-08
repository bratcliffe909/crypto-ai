<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CacheService
{
    /**
     * Cache duration for fresh data (1 minute)
     */
    const FRESH_CACHE_DURATION = 60; // 1 minute
    
    /**
     * Cache duration for stale data (30 days)
     */
    const STALE_CACHE_DURATION = 2592000; // 30 days
    
    /**
     * Remember data with proper timestamp tracking
     * 
     * @param string $key Cache key
     * @param int $seconds Fresh cache duration (default 60 seconds)
     * @param callable $callback Function to fetch fresh data
     * @param callable|null $fallbackCallback Optional fallback API
     * @return array
     */
    public function remember(string $key, int $seconds = self::FRESH_CACHE_DURATION, callable $callback, callable $fallbackCallback = null): array
    {
        $this->recordRequest();
        
        // Get cached data with metadata
        $cachedData = $this->getCachedWithMetadata($key);
        
        // If cache exists and is fresh (under 1 minute), return it
        if ($cachedData && $cachedData['age'] < $seconds) {
            $this->recordCacheHit();
            return $this->formatResponse($cachedData['data'], $cachedData['timestamp'], $cachedData['age'], 'cache');
        }
        
        // Try to fetch fresh data
        try {
            $freshData = $callback();
            
            if ($freshData && !empty($freshData)) {
                // Store with metadata
                $this->storeWithMetadata($key, $freshData);
                $this->recordApiSuccess();
                return $this->formatResponse($freshData, now(), 0, 'primary');
            }
        } catch (\Exception $e) {
            Log::warning("Primary API failed for {$key}", ['error' => $e->getMessage()]);
            $this->recordApiFailure($e->getMessage());
        }
        
        // Try fallback API if provided
        if ($fallbackCallback) {
            try {
                $fallbackData = $fallbackCallback();
                
                if ($fallbackData && !empty($fallbackData)) {
                    // Store fallback data
                    $this->storeWithMetadata($key, $fallbackData);
                    return $this->formatResponse($fallbackData, now(), 0, 'fallback');
                }
            } catch (\Exception $e) {
                Log::warning("Fallback API failed for {$key}", ['error' => $e->getMessage()]);
            }
        }
        
        // Return stale cache if available
        if ($cachedData) {
            Log::info("Returning stale cache for {$key}", ['age' => $cachedData['age']]);
            return $this->formatResponse($cachedData['data'], $cachedData['timestamp'], $cachedData['age'], 'stale_cache');
        }
        
        // No data available
        return $this->formatResponse([], now(), 0, 'none');
    }
    
    /**
     * Get cached data with metadata
     */
    private function getCachedWithMetadata(string $key): ?array
    {
        $metaKey = $key . '_meta';
        
        $data = Cache::get($key);
        $metadata = Cache::get($metaKey);
        
        if (!$data || !$metadata) {
            return null;
        }
        
        $timestamp = Carbon::parse($metadata['timestamp']);
        $age = $timestamp->diffInSeconds(now());
        
        return [
            'data' => $data,
            'timestamp' => $timestamp,
            'age' => $age,
            'source' => $metadata['source'] ?? 'unknown'
        ];
    }
    
    /**
     * Store data with metadata
     */
    public function storeWithMetadata(string $key, $data): void
    {
        $metaKey = $key . '_meta';
        
        // Store data for 30 days
        Cache::put($key, $data, self::STALE_CACHE_DURATION);
        
        // Store metadata
        Cache::put($metaKey, [
            'timestamp' => now()->toIso8601String(),
            'source' => 'api'
        ], self::STALE_CACHE_DURATION);
    }
    
    /**
     * Format response with metadata
     */
    private function formatResponse($data, $timestamp, int $age, string $source): array
    {
        return [
            'data' => $data,
            'metadata' => [
                'lastUpdated' => $timestamp instanceof Carbon ? $timestamp->toIso8601String() : $timestamp,
                'cacheAge' => $age,
                'source' => $source,
                'isFresh' => $age < self::FRESH_CACHE_DURATION
            ]
        ];
    }
    
    /**
     * Get cached data without freshness check - for use with background updates
     * Always returns cache if available, only calls callback if cache is empty
     */
    public function rememberWithoutFreshness(string $key, callable $callback): array
    {
        $this->recordRequest();
        
        // Get cached data with metadata
        $cachedData = $this->getCachedWithMetadata($key);
        
        // If cache exists, return it regardless of age
        if ($cachedData) {
            $this->recordCacheHit();
            return $this->formatResponse($cachedData['data'], $cachedData['timestamp'], $cachedData['age'], 'cache');
        }
        
        // No cache exists, try to fetch data
        try {
            $freshData = $callback();
            
            if ($freshData && !empty($freshData)) {
                // Store with metadata
                $this->storeWithMetadata($key, $freshData);
                $this->recordApiSuccess();
                return $this->formatResponse($freshData, now(), 0, 'primary');
            }
        } catch (\Exception $e) {
            Log::warning("API failed for {$key}", ['error' => $e->getMessage()]);
            $this->recordApiFailure($e->getMessage());
        }
        
        // No data available
        return $this->formatResponse([], now(), 0, 'none');
    }
    
    /**
     * Clear cache for a specific key
     */
    public function forget(string $key): void
    {
        Cache::forget($key);
        Cache::forget($key . '_meta');
    }
    
    /**
     * Check if cache is fresh
     */
    public function isFresh(string $key, int $maxAge = self::FRESH_CACHE_DURATION): bool
    {
        $cached = $this->getCachedWithMetadata($key);
        return $cached && $cached['age'] < $maxAge;
    }
    
    /**
     * Get stale cached data (regardless of age)
     */
    public function getStale(string $key)
    {
        $cachedData = $this->getCachedWithMetadata($key);
        if ($cachedData) {
            Log::info("Returning stale cache for {$key}", ['age' => $cachedData['age']]);
            return $cachedData['data'];
        }
        return null;
    }
    
    /**
     * Remember historical data with intelligent gap filling
     * 
     * @param string $key Cache key
     * @param callable $callback Function to fetch new data (receives $fromDate, $toDate)
     * @param string $dateField The field name containing dates in the data
     * @param int $cacheDuration Cache duration in seconds (default 30 days)
     * @return array
     */
    public function rememberHistorical(string $key, callable $callback, string $dateField = 'date', int $cacheDuration = 2592000): array
    {
        $metaKey = $key . '_historical_meta';
        
        // Get existing cached data
        $cachedData = Cache::get($key, []);
        $metadata = Cache::get($metaKey, [
            'lastDate' => null,
            'firstDate' => null,
            'lastUpdated' => null
        ]);
        
        $now = now();
        $today = $now->format('Y-m-d');
        
        // If we have cached data and it's up to date (last date is today or yesterday), return it
        if (!empty($cachedData) && isset($metadata['lastDate'])) {
            $lastDate = Carbon::parse($metadata['lastDate']);
            $daysSinceLastUpdate = $lastDate->diffInDays($now);
            
            if ($daysSinceLastUpdate <= 1) {
                Log::info("Historical data for {$key} is up to date", [
                    'lastDate' => $metadata['lastDate'],
                    'dataPoints' => count($cachedData)
                ]);
                
                return $this->formatResponse($cachedData, $metadata['lastUpdated'], 0, 'cache');
            }
        }
        
        try {
            // Determine the date range we need to fetch
            $fromDate = null;
            $toDate = $today;
            
            if (!empty($cachedData) && isset($metadata['lastDate'])) {
                // We have existing data, only fetch the gap
                $fromDate = Carbon::parse($metadata['lastDate'])->addDay()->format('Y-m-d');
                Log::info("Fetching historical gap for {$key}", [
                    'from' => $fromDate,
                    'to' => $toDate,
                    'existingDataPoints' => count($cachedData)
                ]);
            } else {
                // No existing data, let the callback determine the full range
                Log::info("Fetching full historical data for {$key}");
            }
            
            // Fetch new data
            $newData = $callback($fromDate, $toDate);
            
            if (!empty($newData)) {
                // Merge with existing data
                if (!empty($cachedData)) {
                    // Convert to associative array by date for easier merging
                    $existingByDate = [];
                    foreach ($cachedData as $item) {
                        if (isset($item[$dateField])) {
                            $existingByDate[$item[$dateField]] = $item;
                        }
                    }
                    
                    // Add new data
                    foreach ($newData as $item) {
                        if (isset($item[$dateField])) {
                            $existingByDate[$item[$dateField]] = $item;
                        }
                    }
                    
                    // Sort by date and convert back to indexed array
                    ksort($existingByDate);
                    $mergedData = array_values($existingByDate);
                } else {
                    $mergedData = $newData;
                }
                
                // Update metadata
                $dates = array_map(function($item) use ($dateField) {
                    return $item[$dateField] ?? null;
                }, $mergedData);
                $dates = array_filter($dates);
                
                if (!empty($dates)) {
                    $newMetadata = [
                        'firstDate' => min($dates),
                        'lastDate' => max($dates),
                        'lastUpdated' => $now->toIso8601String(),
                        'dataPoints' => count($mergedData)
                    ];
                    
                    // Store the merged data
                    Cache::put($key, $mergedData, $cacheDuration);
                    Cache::put($metaKey, $newMetadata, $cacheDuration);
                    
                    Log::info("Updated historical cache for {$key}", $newMetadata);
                    
                    return $this->formatResponse($mergedData, $now, 0, 'merged');
                }
            }
            
            // If no new data but we have cached data, return it
            if (!empty($cachedData)) {
                return $this->formatResponse($cachedData, $metadata['lastUpdated'], 
                    Carbon::parse($metadata['lastUpdated'])->diffInSeconds($now), 'cache');
            }
            
        } catch (\Exception $e) {
            Log::warning("Failed to fetch historical data for {$key}", ['error' => $e->getMessage()]);
            
            // Return cached data if available
            if (!empty($cachedData)) {
                return $this->formatResponse($cachedData, $metadata['lastUpdated'], 
                    Carbon::parse($metadata['lastUpdated'])->diffInSeconds($now), 'cache_on_error');
            }
        }
        
        // No data available
        return $this->formatResponse([], $now, 0, 'none');
    }
    
    /**
     * Record a request for statistics
     */
    private function recordRequest(): void
    {
        $stats = Cache::get('system_stats', [
            'totalRequests' => 0,
            'cacheHits' => 0,
            'apiFailures' => 0,
            'rateLimits' => 0,
            'lastApiSuccess' => null,
            'lastCacheHit' => null,
            'apiProviders' => []
        ]);
        
        $stats['totalRequests']++;
        
        // Keep stats for 1 hour
        Cache::put('system_stats', $stats, 3600);
    }
    
    /**
     * Record a cache hit
     */
    private function recordCacheHit(): void
    {
        $stats = Cache::get('system_stats', [
            'totalRequests' => 0,
            'cacheHits' => 0,
            'apiFailures' => 0,
            'rateLimits' => 0,
            'lastApiSuccess' => null,
            'lastCacheHit' => null,
            'apiProviders' => []
        ]);
        
        $stats['cacheHits']++;
        $stats['lastCacheHit'] = now()->toIso8601String();
        
        Cache::put('system_stats', $stats, 3600);
    }
    
    /**
     * Record an API failure
     */
    private function recordApiFailure(string $error): void
    {
        $stats = Cache::get('system_stats', [
            'totalRequests' => 0,
            'cacheHits' => 0,
            'apiFailures' => 0,
            'rateLimits' => 0,
            'lastApiSuccess' => null,
            'lastCacheHit' => null,
            'apiProviders' => []
        ]);
        
        if (stripos($error, 'rate limit') !== false || stripos($error, '429') !== false) {
            $stats['rateLimits']++;
        } else {
            $stats['apiFailures']++;
        }
        
        Cache::put('system_stats', $stats, 3600);
    }
    
    /**
     * Record a successful API call
     */
    private function recordApiSuccess(): void
    {
        $stats = Cache::get('system_stats', [
            'totalRequests' => 0,
            'cacheHits' => 0,
            'apiFailures' => 0,
            'rateLimits' => 0,
            'lastApiSuccess' => null,
            'lastCacheHit' => null,
            'apiProviders' => []
        ]);
        
        $stats['lastApiSuccess'] = now()->toIso8601String();
        
        Cache::put('system_stats', $stats, 3600);
    }
}