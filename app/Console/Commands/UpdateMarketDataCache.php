<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\AlternativeService;
use App\Services\CoinGeckoService;
use Illuminate\Support\Facades\Log;

class UpdateMarketDataCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:update-market-data {--force : Force update even if cache is fresh}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update Redis cache for Fear & Greed Index, Global Market Stats, and Trending coins';

    protected $alternativeService;
    protected $coinGeckoService;

    /**
     * Create a new command instance.
     */
    public function __construct(AlternativeService $alternativeService, CoinGeckoService $coinGeckoService)
    {
        parent::__construct();
        $this->alternativeService = $alternativeService;
        $this->coinGeckoService = $coinGeckoService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting market data cache update...');
        
        $startTime = microtime(true);
        $results = [
            'fearGreed' => ['status' => 'pending', 'value' => null, 'error' => null],
            'globalStats' => ['status' => 'pending', 'data' => null, 'error' => null],
            'trending' => ['status' => 'pending', 'count' => 0, 'error' => null]
        ];
        
        // Update Fear & Greed Index
        try {
            $this->info('Updating Fear & Greed Index...');
            $fearGreedData = $this->alternativeService->getFearGreedIndex();
            
            if (isset($fearGreedData['data']) && !empty($fearGreedData['data'])) {
                $currentValue = $fearGreedData['data'][0]['value'] ?? null;
                $classification = $fearGreedData['data'][0]['value_classification'] ?? 'Unknown';
                $results['fearGreed']['value'] = $currentValue;
                $results['fearGreed']['status'] = 'success';
                $this->info("✓ Fear & Greed Index updated: {$currentValue} ({$classification})");
            } else {
                $results['fearGreed']['status'] = 'empty';
                $this->warn('⚠ Fear & Greed Index returned empty response');
            }
        } catch (\Exception $e) {
            $results['fearGreed']['status'] = 'failed';
            $results['fearGreed']['error'] = $e->getMessage();
            $this->error('✗ Failed to update Fear & Greed Index: ' . $e->getMessage());
            Log::error('Fear & Greed Index cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update Global Market Stats
        try {
            $this->info('Updating Global Market Stats...');
            $globalData = $this->coinGeckoService->getGlobalData();
            
            if (isset($globalData['data']) && !empty($globalData['data'])) {
                $marketCap = $globalData['data']['data']['total_market_cap']['usd'] ?? 0;
                $results['globalStats']['data'] = [
                    'market_cap' => $marketCap,
                    'btc_dominance' => $globalData['data']['data']['market_cap_percentage']['btc'] ?? 0
                ];
                $results['globalStats']['status'] = 'success';
                $marketCapB = number_format($marketCap / 1000000000, 2);
                $this->info("✓ Global Market Stats updated: \${$marketCapB}B market cap");
            } else {
                $results['globalStats']['status'] = 'empty';
                $this->warn('⚠ Global Market Stats returned empty response');
            }
        } catch (\Exception $e) {
            $results['globalStats']['status'] = 'failed';
            $results['globalStats']['error'] = $e->getMessage();
            $this->error('✗ Failed to update Global Market Stats: ' . $e->getMessage());
            Log::error('Global Market Stats cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update Trending Coins
        try {
            $this->info('Updating Trending Coins...');
            $trendingData = $this->coinGeckoService->getTrending();
            
            if (isset($trendingData['data']) && isset($trendingData['data']['coins'])) {
                $trendingCoins = $trendingData['data']['coins'];
                $results['trending']['count'] = count($trendingCoins);
                $results['trending']['status'] = 'success';
                $this->info('✓ Trending Coins updated: ' . count($trendingCoins) . ' coins');
            } else {
                $results['trending']['status'] = 'empty';
                $this->warn('⚠ Trending Coins returned empty response');
            }
        } catch (\Exception $e) {
            $results['trending']['status'] = 'failed';
            $results['trending']['error'] = $e->getMessage();
            $this->error('✗ Failed to update Trending Coins: ' . $e->getMessage());
            Log::error('Trending Coins cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        $duration = round(microtime(true) - $startTime, 2);
        
        // Display summary
        $this->info("\n" . 'Cache update completed in ' . $duration . ' seconds');
        $this->table(
            ['Component', 'Status', 'Details', 'Error'],
            [
                ['Fear & Greed Index', $results['fearGreed']['status'], $results['fearGreed']['value'] ?? '-', $results['fearGreed']['error'] ?? '-'],
                ['Global Market Stats', $results['globalStats']['status'], isset($results['globalStats']['data']) ? 'Updated' : '-', $results['globalStats']['error'] ?? '-'],
                ['Trending Coins', $results['trending']['status'], $results['trending']['count'] . ' coins', $results['trending']['error'] ?? '-'],
            ]
        );
        
        // Log summary
        Log::info('Market data cache update completed', [
            'duration' => $duration,
            'results' => $results
        ]);
        
        // Return success if at least one component updated successfully
        return ($results['fearGreed']['status'] === 'success' || 
                $results['globalStats']['status'] === 'success' || 
                $results['trending']['status'] === 'success') 
            ? Command::SUCCESS 
            : Command::FAILURE;
    }
}