<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class WalletCacheService
{
    protected $coinGeckoService;
    
    public function __construct(CoinGeckoService $coinGeckoService)
    {
        $this->coinGeckoService = $coinGeckoService;
    }
    
    /**
     * Get all unique coin IDs from all wallets stored in cache
     */
    public function getActiveWalletCoinIds(): array
    {
        $coinIds = [];
        
        // Get all cache keys that match wallet pattern
        // Note: Redis doesn't support wildcard searches efficiently, 
        // so we'll track active wallets separately
        $activeWalletsKey = 'active_wallet_coins';
        $activeCoins = Cache::get($activeWalletsKey, []);
        
        return array_unique($activeCoins);
    }
    
    /**
     * Track a coin as being used in a wallet
     */
    public function trackWalletCoin(string $coinId): void
    {
        $activeWalletsKey = 'active_wallet_coins';
        $activeCoins = Cache::get($activeWalletsKey, []);
        
        if (!in_array($coinId, $activeCoins)) {
            $activeCoins[] = $coinId;
            // Store for 7 days - if a coin isn't accessed in a week, stop tracking it
            Cache::put($activeWalletsKey, $activeCoins, 60 * 60 * 24 * 7);
            
            Log::info('Added coin to active wallet tracking', ['coin_id' => $coinId]);
        }
    }
    
    /**
     * Update cache for all actively used wallet coins
     */
    public function updateActiveWalletCache(): array
    {
        $coinIds = $this->getActiveWalletCoinIds();
        $results = [
            'total_coins' => count($coinIds),
            'updated' => 0,
            'failed' => 0,
            'coins' => []
        ];
        
        if (empty($coinIds)) {
            Log::info('No active wallet coins to update');
            return $results;
        }
        
        Log::info('Updating wallet cache for coins', ['count' => count($coinIds), 'coins' => $coinIds]);
        
        // Update coins in batches to avoid rate limits
        $chunks = array_chunk($coinIds, 50); // CoinGecko allows up to 50 IDs per request
        
        foreach ($chunks as $chunk) {
            try {
                // Use the new method to get FULL market data for specific coins
                $response = $this->coinGeckoService->getSpecificCoinsMarketData($chunk, 'usd');
                
                if ($response['success'] && isset($response['data']) && is_array($response['data'])) {
                    // Map found coins by ID for easy lookup
                    $foundCoinsMap = [];
                    foreach ($response['data'] as $coin) {
                        if (isset($coin['id'])) {
                            $foundCoinsMap[$coin['id']] = $coin;
                        }
                    }
                    
                    // Process each requested coin
                    foreach ($chunk as $coinId) {
                        if (isset($foundCoinsMap[$coinId])) {
                            $results['updated']++;
                            $results['coins'][$coinId] = 'updated';
                            
                            // Note: Individual coin caching is already handled in getSpecificCoinsMarketData
                        } else {
                            $results['failed']++;
                            $results['coins'][$coinId] = 'not_found';
                        }
                    }
                } else {
                    $results['failed'] += count($chunk);
                    $error = $response['error'] ?? 'unknown_error';
                    foreach ($chunk as $coinId) {
                        $results['coins'][$coinId] = 'api_error: ' . $error;
                    }
                    Log::warning('Failed to fetch market data for wallet coins', [
                        'error' => $error,
                        'coins' => $chunk
                    ]);
                }
                
                // Small delay between batches to avoid rate limits
                if (count($chunks) > 1) {
                    sleep(1);
                }
                
            } catch (\Exception $e) {
                Log::error('Failed to update wallet cache batch', [
                    'error' => $e->getMessage(),
                    'coins' => $chunk
                ]);
                
                $results['failed'] += count($chunk);
                foreach ($chunk as $coinId) {
                    $results['coins'][$coinId] = 'exception';
                }
            }
        }
        
        // Note: Individual coin data is updated through the getSimplePrice call above
        // which caches the price data for each coin
        
        Log::info('Wallet cache update completed', $results);
        
        return $results;
    }
    
    /**
     * Clean up coins that haven't been accessed recently
     */
    public function cleanupInactiveCoins(): int
    {
        $activeWalletsKey = 'active_wallet_coins';
        $activeCoins = Cache::get($activeWalletsKey, []);
        $originalCount = count($activeCoins);
        
        // For now, we'll keep all coins since we're storing the list for 7 days
        // In the future, we could implement more sophisticated tracking
        
        return 0; // No coins removed
    }
}