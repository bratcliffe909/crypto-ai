<?php

namespace App\Repositories\Contracts;

interface RepositoryInterface
{
    /**
     * Get data with cache coordination
     *
     * @param string $key
     * @param callable $dataCallback
     * @param int $ttl
     * @return mixed
     */
    public function remember(string $key, callable $dataCallback, int $ttl = 3600);

    /**
     * Clear cache for specific key
     *
     * @param string $key
     * @return bool
     */
    public function forget(string $key): bool;

    /**
     * Clear all cache for this repository
     *
     * @return bool
     */
    public function flush(): bool;

    /**
     * Validate data structure
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool;
}