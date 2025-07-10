<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class UpdateAllCaches extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:update-all 
                            {--skip-market : Skip market cache update}
                            {--skip-wallet : Skip wallet cache update}
                            {--skip-market-data : Skip market data cache update}
                            {--skip-news-calendar : Skip news and calendar cache update}
                            {--skip-indicators : Skip indicators cache update}
                            {--force : Force update even if cache is fresh}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update all Redis caches (market, wallet, market data, news/calendar, indicators)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Starting comprehensive cache update...');
        $this->info(str_repeat('=', 60));
        
        $startTime = microtime(true);
        $results = [];
        $force = $this->option('force');
        
        // 1. Update Market Cache (coin prices)
        if (!$this->option('skip-market')) {
            $this->updateCache(
                'market:update-cache',
                'Market Cache (Top 250 coins)',
                $results,
                ['--per-page' => 250]
            );
        }
        
        // 2. Update Wallet Cache (portfolio coins)
        if (!$this->option('skip-wallet')) {
            $this->updateCache(
                'wallet:update-cache',
                'Wallet Cache (Portfolio coins)',
                $results,
                $force ? ['--force' => true] : []
            );
        }
        
        // 3. Update Market Data Cache (Fear & Greed, Global Stats, Trending)
        if (!$this->option('skip-market-data')) {
            $this->updateCache(
                'cache:update-market-data',
                'Market Data Cache (Fear & Greed, Global Stats, Trending)',
                $results,
                $force ? ['--force' => true] : []
            );
        }
        
        // 4. Update News and Calendar Cache
        if (!$this->option('skip-news-calendar')) {
            $this->updateCache(
                'cache:update-news-calendar',
                'News & Calendar Cache',
                $results,
                $force ? ['--force' => true] : []
            );
        }
        
        // 5. Update Indicators Cache (Pi Cycle, Rainbow Chart, etc.)
        if (!$this->option('skip-indicators')) {
            $this->updateCache(
                'cache:update-indicators',
                'Indicators Cache (Pi Cycle, Rainbow Chart, Altcoin Season, RSI)',
                $results,
                $force ? ['--force' => true] : []
            );
        }
        
        $totalDuration = round(microtime(true) - $startTime, 2);
        
        // Display summary
        $this->info("\n" . str_repeat('=', 60));
        $this->info('📊 Cache Update Summary');
        $this->info(str_repeat('=', 60));
        
        $headers = ['Cache Type', 'Status', 'Duration', 'Details'];
        $rows = [];
        
        $successCount = 0;
        $failureCount = 0;
        
        foreach ($results as $result) {
            $rows[] = [
                $result['name'],
                $result['success'] ? '✅ Success' : '❌ Failed',
                $result['duration'] . 's',
                $result['details']
            ];
            
            if ($result['success']) {
                $successCount++;
            } else {
                $failureCount++;
            }
        }
        
        $this->table($headers, $rows);
        
        $this->info("\n" . str_repeat('=', 60));
        $this->info("✨ Total Duration: {$totalDuration} seconds");
        $this->info("✅ Successful: {$successCount}");
        if ($failureCount > 0) {
            $this->error("❌ Failed: {$failureCount}");
        }
        $this->info(str_repeat('=', 60));
        
        // Log summary
        Log::info('All caches update completed', [
            'duration' => $totalDuration,
            'results' => $results,
            'success_count' => $successCount,
            'failure_count' => $failureCount
        ]);
        
        return $failureCount === 0 ? Command::SUCCESS : Command::FAILURE;
    }
    
    /**
     * Update a specific cache and track results
     */
    private function updateCache($command, $name, &$results, $options = [])
    {
        $this->info("\n🔄 Updating {$name}...");
        
        $startTime = microtime(true);
        
        try {
            $exitCode = Artisan::call($command, $options);
            $output = Artisan::output();
            
            // Extract key details from output
            $details = $this->extractDetails($command, $output);
            
            $duration = round(microtime(true) - $startTime, 2);
            
            $results[] = [
                'name' => $name,
                'command' => $command,
                'success' => $exitCode === 0,
                'duration' => $duration,
                'details' => $details,
                'output' => $output
            ];
            
            if ($exitCode === 0) {
                $this->info("✅ {$name} updated successfully in {$duration}s");
            } else {
                $this->error("❌ {$name} update failed!");
            }
            
        } catch (\Exception $e) {
            $duration = round(microtime(true) - $startTime, 2);
            
            $results[] = [
                'name' => $name,
                'command' => $command,
                'success' => false,
                'duration' => $duration,
                'details' => 'Error: ' . $e->getMessage(),
                'output' => ''
            ];
            
            $this->error("❌ {$name} update failed with error: " . $e->getMessage());
            Log::error("Cache update failed for {$command}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
    
    /**
     * Extract key details from command output
     */
    private function extractDetails($command, $output)
    {
        // Extract relevant details based on command type
        switch ($command) {
            case 'market:update-cache':
                if (preg_match('/Successfully fetched (\d+) coins/', $output, $matches)) {
                    return $matches[1] . ' coins updated';
                }
                break;
                
            case 'wallet:update-cache':
                if (preg_match('/Successfully Updated\s*\|\s*(\d+)/', $output, $matches)) {
                    return $matches[1] . ' coins updated';
                }
                break;
                
            case 'cache:update-market-data':
                $details = [];
                if (preg_match('/Fear & Greed Index updated: (\d+)/', $output, $matches)) {
                    $details[] = 'F&G: ' . $matches[1];
                }
                if (preg_match('/\$([0-9,\.]+)B market cap/', $output, $matches)) {
                    $details[] = 'MC: $' . $matches[1] . 'B';
                }
                if (preg_match('/Trending Coins updated: (\d+)/', $output, $matches)) {
                    $details[] = 'Trending: ' . $matches[1];
                }
                return implode(', ', $details) ?: 'Updated';
                
            case 'cache:update-news-calendar':
                $details = [];
                if (preg_match('/News feed updated: (\d+) articles/', $output, $matches)) {
                    $details[] = $matches[1] . ' news';
                }
                if (preg_match('/Economic calendar updated: (\d+) events/', $output, $matches)) {
                    $details[] = $matches[1] . ' events';
                }
                return implode(', ', $details) ?: 'Updated';
                
            case 'cache:update-indicators':
                $details = [];
                if (preg_match('/Pi Cycle Top updated: (\d+)/', $output, $matches)) {
                    $details[] = 'Pi: ' . $matches[1];
                }
                if (preg_match('/Rainbow Chart updated: (\d+)/', $output, $matches)) {
                    $details[] = 'Rainbow: ' . $matches[1];
                }
                if (preg_match('/Altcoin Season Index updated: (\d+)/', $output, $matches)) {
                    $details[] = 'Alt: ' . $matches[1] . '%';
                }
                if (preg_match('/Bitcoin RSI updated: ([\d\.]+)/', $output, $matches)) {
                    $details[] = 'RSI: ' . $matches[1];
                }
                return implode(', ', $details) ?: 'Updated';
        }
        
        return 'Updated';
    }
}