<?php

namespace App\Repositories;

use App\Services\CoinGeckoService;
use App\Services\CacheService;

class MarketDataRepository extends BaseRepository
{
    private CoinGeckoService $coinGeckoService;

    public function __construct(
        CacheService $cacheService,
        CoinGeckoService $coinGeckoService
    ) {
        parent::__construct($cacheService);
        $this->coinGeckoService = $coinGeckoService;
    }

    /**
     * Get the cache prefix for market data
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'market_data';
    }

    /**
     * Get market overview data
     * Note: In Phase 1, this just provides structure. Logic will be moved in Phase 2.
     *
     * @param string $vsCurrency
     * @param int $perPage
     * @return array
     */
    public function getMarketOverview(string $vsCurrency = 'usd', int $perPage = 250): array
    {
        $this->logOperation('getMarketOverview', [
            'vsCurrency' => $vsCurrency,
            'perPage' => $perPage
        ]);

        // For now, delegate to service - will be refactored in Phase 2
        return $this->coinGeckoService->getMarkets($vsCurrency, $perPage);
    }

    /**
     * Get simple price data for specific coins
     *
     * @param array $ids
     * @param string $vsCurrency
     * @return array
     */
    public function getSimplePrice(array $ids, string $vsCurrency = 'usd'): array
    {
        $this->logOperation('getSimplePrice', [
            'ids' => $ids,
            'vsCurrency' => $vsCurrency
        ]);

        // For now, delegate to service - will be refactored in Phase 2
        $idsString = implode(',', $ids);
        return $this->coinGeckoService->getSimplePrice($idsString, $vsCurrency);
    }

    /**
     * Get trending coins
     *
     * @return array
     */
    public function getTrendingCoins(): array
    {
        $this->logOperation('getTrendingCoins');

        // For now, delegate to service - will be refactored in Phase 2
        return $this->coinGeckoService->getTrending();
    }

    /**
     * Calculate market metrics (will be implemented in Phase 2)
     *
     * @param array $marketData
     * @return array
     */
    public function calculateMarketMetrics(array $marketData): array
    {
        // Placeholder for Phase 2 implementation
        return [
            'total_market_cap' => 0,
            'total_volume' => 0,
            'active_cryptos' => count($marketData),
            'average_price_change' => 0
        ];
    }

    /**
     * Aggregate market data from multiple sources (Phase 2)
     *
     * @param array $sources
     * @return array
     */
    public function aggregateMarketData(array $sources): array
    {
        // Placeholder for Phase 2 implementation
        return [];
    }

    /**
     * Validate market data structure
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Basic validation - will be enhanced in Phase 2
        if (isset($data['data']) && is_array($data['data'])) {
            return true;
        }

        // For simple arrays of market data
        if (!empty($data) && isset($data[0]['id'])) {
            return true;
        }

        return false;
    }
}