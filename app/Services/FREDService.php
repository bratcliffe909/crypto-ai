<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FREDService
{
    private $apiKey;
    private $baseUrl = 'https://api.stlouisfed.org/fred';
    private $cacheService;

    public function __construct(CacheService $cacheService)
    {
        $this->apiKey = config('services.fred.key');
        $this->cacheService = $cacheService;
    }

    /**
     * Check if FRED API is configured
     */
    public function isConfigured()
    {
        return !empty($this->apiKey);
    }

    /**
     * Get release dates for economic data
     */
    public function getReleasesDates($realtime_start = null, $realtime_end = null, $limit = 1000)
    {
        if (!$this->isConfigured()) {
            return [];
        }

        $cacheKey = "fred_releases_dates_" . md5(($realtime_start ?? '') . ($realtime_end ?? ''));

        return $this->cacheService->remember($cacheKey, 1440, function () use ($realtime_start, $realtime_end, $limit) {
            $params = [
                'api_key' => $this->apiKey,
                'file_type' => 'json',
                'limit' => $limit,
                'sort_order' => 'asc',
                'include_release_dates_with_no_data' => 'true'
            ];

            if ($realtime_start) {
                $params['realtime_start'] = $realtime_start;
            }

            if ($realtime_end) {
                $params['realtime_end'] = $realtime_end;
            }

            try {
                $response = Http::timeout(30)->get($this->baseUrl . '/releases/dates', $params);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['error_code'])) {
                        Log::error('FRED API error', ['error' => $data]);
                        throw new \Exception($data['error_message'] ?? 'FRED API Error');
                    }
                    
                    return $data['release_dates'] ?? [];
                }
            } catch (\Exception $e) {
                Log::error('FRED API request failed', ['error' => $e->getMessage()]);
            }

            return [];
        });
    }

    /**
     * Get specific release information
     */
    public function getRelease($releaseId)
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $cacheKey = "fred_release_{$releaseId}";

        return $this->cacheService->remember($cacheKey, 1440, function () use ($releaseId) {
            $params = [
                'api_key' => $this->apiKey,
                'file_type' => 'json',
                'release_id' => $releaseId
            ];

            try {
                $response = Http::timeout(30)->get($this->baseUrl . '/release', $params);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['error_code'])) {
                        throw new \Exception($data['error_message'] ?? 'FRED API Error');
                    }
                    
                    return $data['releases'][0] ?? null;
                }
            } catch (\Exception $e) {
                Log::error('FRED API release request failed', ['error' => $e->getMessage()]);
            }

            return null;
        });
    }

    /**
     * Get all releases
     */
    public function getAllReleases()
    {
        if (!$this->isConfigured()) {
            return [];
        }

        $cacheKey = "fred_all_releases";

        return $this->cacheService->remember($cacheKey, 1440, function () {
            $params = [
                'api_key' => $this->apiKey,
                'file_type' => 'json',
                'limit' => 1000
            ];

            try {
                $response = Http::timeout(30)->get($this->baseUrl . '/releases', $params);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['error_code'])) {
                        throw new \Exception($data['error_message'] ?? 'FRED API Error');
                    }
                    
                    return $data['releases'] ?? [];
                }
            } catch (\Exception $e) {
                Log::error('FRED API releases request failed', ['error' => $e->getMessage()]);
            }

            return [];
        });
    }

    /**
     * Map FRED releases to economic events
     */
    public function mapToEconomicEvents($releaseDates)
    {
        $events = [];
        
        // Map of release IDs to event details
        $releaseMapping = [
            '10' => ['name' => 'Employment Situation', 'impact' => 'high', 'description' => 'US Non-Farm Payrolls and Unemployment Rate'],
            '11' => ['name' => 'Consumer Price Index', 'impact' => 'high', 'description' => 'US CPI - key inflation indicator'],
            '12' => ['name' => 'Producer Price Index', 'impact' => 'medium', 'description' => 'US PPI - wholesale inflation'],
            '53' => ['name' => 'GDP', 'impact' => 'high', 'description' => 'US Gross Domestic Product'],
            '82' => ['name' => 'Personal Income and Outlays', 'impact' => 'medium', 'description' => 'PCE inflation data'],
            '21' => ['name' => 'Industrial Production', 'impact' => 'medium', 'description' => 'Manufacturing and production data'],
            '20' => ['name' => 'Retail Sales', 'impact' => 'high', 'description' => 'Consumer spending indicator'],
            '15' => ['name' => 'Housing Starts', 'impact' => 'medium', 'description' => 'New residential construction'],
            '175' => ['name' => 'Jobless Claims', 'impact' => 'medium', 'description' => 'Weekly unemployment insurance claims']
        ];

        foreach ($releaseDates as $release) {
            $releaseId = $release['release_id'] ?? null;
            
            if ($releaseId && isset($releaseMapping[$releaseId])) {
                $mapping = $releaseMapping[$releaseId];
                $events[] = [
                    'event' => $mapping['name'],
                    'date' => $release['date'],
                    'impact' => $mapping['impact'],
                    'country' => 'US',
                    'description' => $mapping['description'],
                    'source' => 'FRED'
                ];
            }
        }

        return $events;
    }

    /**
     * Get Federal Funds Rate data
     */
    public function getFederalFundsRate($startDate, $endDate)
    {
        return $this->getSeriesData('FEDFUNDS', $startDate, $endDate);
    }

    /**
     * Get Inflation (CPI) data
     */
    public function getInflationCPI($startDate, $endDate)
    {
        return $this->getSeriesData('CPIAUCSL', $startDate, $endDate);
    }

    /**
     * Get Unemployment Rate data
     */
    public function getUnemploymentRate($startDate, $endDate)
    {
        return $this->getSeriesData('UNRATE', $startDate, $endDate);
    }

    /**
     * Get Dollar Index (DXY) data
     */
    public function getDollarIndex($startDate, $endDate)
    {
        return $this->getSeriesData('DTWEXBGS', $startDate, $endDate);
    }

    /**
     * Get series data from FRED API
     */
    private function getSeriesData($seriesId, $startDate, $endDate)
    {
        if (!$this->isConfigured()) {
            return [];
        }

        $cacheKey = "fred_series_{$seriesId}_{$startDate}_{$endDate}";

        $result = $this->cacheService->remember($cacheKey, 3600, function () use ($seriesId, $startDate, $endDate) {
            $params = [
                'api_key' => $this->apiKey,
                'file_type' => 'json',
                'series_id' => $seriesId,
                'observation_start' => $startDate,
                'observation_end' => $endDate,
                'sort_order' => 'asc',
                'limit' => 10000
            ];

            try {
                $response = Http::timeout(30)->get($this->baseUrl . '/series/observations', $params);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['error_code'])) {
                        Log::error('FRED API error for series ' . $seriesId, ['error' => $data]);
                        throw new \Exception($data['error_message'] ?? 'FRED API Error');
                    }
                    
                    $observations = $data['observations'] ?? [];
                    $formattedData = [];

                    foreach ($observations as $observation) {
                        // Skip invalid observations
                        if ($observation['value'] === '.' || $observation['value'] === '' || !is_numeric($observation['value'])) {
                            continue;
                        }

                        $formattedData[] = [
                            'date' => $observation['date'],
                            'value' => floatval($observation['value'])
                        ];
                    }

                    return $formattedData;
                }
            } catch (\Exception $e) {
                Log::error('FRED API series request failed', [
                    'series_id' => $seriesId,
                    'error' => $e->getMessage()
                ]);
            }

            return [];
        });

        return $result['data'] ?? $result;
    }
}