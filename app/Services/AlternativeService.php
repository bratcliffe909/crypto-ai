<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AlternativeService
{
    private $baseUrl = 'https://api.alternative.me';
    private $cacheTime = 300; // 5 minutes

    /**
     * Get Fear and Greed Index data
     */
    public function getFearGreedIndex($limit = 30, $format = 'json', $dateFormat = 'world')
    {
        $cacheKey = "fear_greed_{$limit}_{$format}_{$dateFormat}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($limit, $format, $dateFormat) {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/fng/", [
                    'limit' => $limit,
                    'format' => $format,
                    'date_format' => $dateFormat
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['data'])) {
                        // Transform the data to match our frontend expectations
                        return array_map(function ($item) {
                            return [
                                'value' => $item['value'],
                                'value_classification' => $item['value_classification'],
                                'timestamp' => $item['timestamp'],
                                'time_until_update' => $item['time_until_update'] ?? null
                            ];
                        }, $data['data']);
                    }
                    
                    return [];
                }

                Log::error('Alternative.me API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return [];
            } catch (\Exception $e) {
                Log::error('Alternative.me API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }

    /**
     * Get market cap data
     */
    public function getGlobalMarketCap()
    {
        $cacheKey = 'global_market_cap';
        
        return Cache::remember($cacheKey, $this->cacheTime, function () {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/v2/ticker/global/");

                if ($response->successful()) {
                    return $response->json();
                }

                return [];
            } catch (\Exception $e) {
                Log::error('Alternative.me Global Market Cap API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
}