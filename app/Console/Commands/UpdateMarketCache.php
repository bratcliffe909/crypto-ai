<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CoinGeckoService;
use Illuminate\Support\Facades\Log;

class UpdateMarketCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'market:update-cache {--per-page=250 : Number of coins to fetch}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update Redis cache with latest market data from CoinGecko';

    protected $coinGeckoService;

    /**
     * Create a new command instance.
     */
    public function __construct(CoinGeckoService $coinGeckoService)
    {
        parent::__construct();
        $this->coinGeckoService = $coinGeckoService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting market cache update...');
        
        $startTime = microtime(true);
        $perPage = $this->option('per-page');
        
        try {
            // Fetch fresh market data (bypasses cache)
            $response = $this->coinGeckoService->fetchFreshMarketData('usd', null, $perPage);
            
            if ($response['success'] && isset($response['data'])) {
                $coinCount = count($response['data']);
                $this->info("Successfully fetched {$coinCount} coins from " . ($response['source'] ?? 'API'));
                
                // Log the update
                Log::info('Market cache updated', [
                    'coin_count' => $coinCount,
                    'source' => $response['source'] ?? 'API',
                    'duration' => round(microtime(true) - $startTime, 2)
                ]);
                
                return Command::SUCCESS;
            } else {
                $error = $response['error'] ?? 'Unknown error';
                $this->error("Failed to update market cache: {$error}");
                
                Log::error('Market cache update failed', [
                    'error' => $error,
                    'duration' => round(microtime(true) - $startTime, 2)
                ]);
                
                return Command::FAILURE;
            }
            
        } catch (\Exception $e) {
            $this->error('Exception during market cache update: ' . $e->getMessage());
            
            Log::error('Market cache update exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'duration' => round(microtime(true) - $startTime, 2)
            ]);
            
            return Command::FAILURE;
        }
    }
}
