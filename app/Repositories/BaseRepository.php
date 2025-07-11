<?php

namespace App\Repositories;

use App\Repositories\Contracts\RepositoryInterface;
use App\Services\CacheService;
use Illuminate\Support\Facades\Log;

abstract class BaseRepository implements RepositoryInterface
{
    protected CacheService $cacheService;
    protected string $cachePrefix;

    public function __construct(CacheService $cacheService)
    {
        $this->cacheService = $cacheService;
        $this->cachePrefix = $this->getCachePrefix();
    }

    /**
     * Get the cache prefix for this repository
     *
     * @return string
     */
    abstract protected function getCachePrefix(): string;

    /**
     * Get data with cache coordination
     *
     * @param string $key
     * @param callable $dataCallback
     * @param int $ttl
     * @return mixed
     */
    public function remember(string $key, callable $dataCallback, int $ttl = 3600)
    {
        $fullKey = $this->cachePrefix . '_' . $key;
        
        return $this->cacheService->remember(
            $fullKey,
            $ttl,
            $dataCallback
        );
    }

    /**
     * Clear cache for specific key
     *
     * @param string $key
     * @return bool
     */
    public function forget(string $key): bool
    {
        $fullKey = $this->cachePrefix . '_' . $key;
        return $this->cacheService->forget($fullKey);
    }

    /**
     * Clear all cache for this repository
     *
     * @return bool
     */
    public function flush(): bool
    {
        // This would need to be implemented based on cache driver
        // For now, log the intent
        Log::info("Flush requested for repository with prefix: {$this->cachePrefix}");
        return true;
    }

    /**
     * Default validation - can be overridden
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        return !empty($data);
    }

    /**
     * Transform percentage changes safely
     *
     * @param float|null $value
     * @param int $decimals
     * @return float
     */
    protected function formatPercentage($value, int $decimals = 2): float
    {
        return round((float)($value ?? 0), $decimals);
    }

    /**
     * Transform price values safely
     *
     * @param float|null $value
     * @param int $decimals
     * @return float
     */
    protected function formatPrice($value, int $decimals = 2): float
    {
        return round((float)($value ?? 0), $decimals);
    }

    /**
     * Log repository operations for debugging
     *
     * @param string $operation
     * @param array $context
     * @return void
     */
    protected function logOperation(string $operation, array $context = []): void
    {
        Log::debug("Repository[{$this->cachePrefix}]::{$operation}", $context);
    }
}