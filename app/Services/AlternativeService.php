<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AlternativeService
{
    private $baseUrl = 'https://api.alternative.me';
    private $cacheService;

    public function __construct(CacheService $cacheService)
    {
        $this->cacheService = $cacheService;
    }

    /**
     * Get Fear & Greed Index
     */
    public function getFearGreedIndex($limit = 30)
    {
        $cacheKey = "fear_greed_index_{$limit}";

        return $this->cacheService->rememberWithoutFreshness($cacheKey, function () use ($limit) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/fng/", [
                'limit' => $limit,
                'format' => 'json'
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['data'])) {
                    return $data;
                }
                
                throw new \Exception('Invalid response format from Fear & Greed API');
            }

            throw new \Exception('Fear & Greed Index API request failed');
        });
    }

    /**
     * Get Global Market Cap
     */
    public function getGlobalMarketCap()
    {
        $cacheKey = "alternative_global_market_cap";

        return $this->cacheService->remember($cacheKey, 60, function () {
            $response = Http::timeout(30)->get("https://api.coinmarketcap.com/v1/global/");

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Global market cap API request failed');
        });
    }
}