<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Repositories\WalletRepository;

class UpdateWalletCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'wallet:update-cache {--force : Force update even if recently updated}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update Redis cache for all coins used in wallets';

    protected $walletRepository;

    /**
     * Create a new command instance.
     */
    public function __construct(WalletRepository $walletRepository)
    {
        parent::__construct();
        $this->walletRepository = $walletRepository;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting wallet cache update...');
        
        $startTime = microtime(true);
        
        try {
            // Get active coins using repository
            $activeCoins = $this->walletRepository->getActiveWalletCoinIds();
            
            if (empty($activeCoins)) {
                $this->warn('No active wallet coins found to update.');
                return Command::SUCCESS;
            }
            
            $this->info('Found ' . count($activeCoins) . ' active coins to update: ' . implode(', ', $activeCoins));
            
            // Update the cache using repository
            $results = $this->walletRepository->updateActiveWalletCache();
            
            $duration = round(microtime(true) - $startTime, 2);
            
            // Display results
            $this->info('Cache update completed in ' . $duration . ' seconds');
            $this->table(
                ['Metric', 'Value'],
                [
                    ['Total Coins', $results['total_coins']],
                    ['Successfully Updated', $results['updated']],
                    ['Failed Updates', $results['failed']],
                ]
            );
            
            if ($results['failed'] > 0) {
                $this->error('Failed coins:');
                foreach ($results['coins'] as $coinId => $status) {
                    if ($status  !==  'updated') {
                        $this->line("  - {$coinId}: {$status}");
                    }
                }
            }
            
            // Log to system
            \Log::info('Wallet cache update completed', [
                'duration' => $duration,
                'results' => $results
            ]);
            
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            $this->error('Failed to update wallet cache: ' . $e->getMessage());
            \Log::error('Wallet cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return Command::FAILURE;
        }
    }
}
