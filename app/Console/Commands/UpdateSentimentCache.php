<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CryptoCompareService;
use Illuminate\Support\Facades\Log;

class UpdateSentimentCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sentiment:update-cache';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update market sentiment and social activity cache from CryptoCompare API';

    private $cryptoCompareService;

    /**
     * Create a new command instance.
     */
    public function __construct(CryptoCompareService $cryptoCompareService)
    {
        parent::__construct();
        $this->cryptoCompareService = $cryptoCompareService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting sentiment and social activity cache update...');
        
        try {
            // Update market sentiment
            $this->info('Updating market sentiment...');
            $sentimentData = $this->cryptoCompareService->getMarketSentimentDirect();
            
            $this->info("Market sentiment updated successfully. Score: " . $sentimentData['data']['sentiment_score']);
            Log::info('Market sentiment cache updated', [
                'score' => $sentimentData['data']['sentiment_score'],
                'timestamp' => now()
            ]);
            
        } catch (\Exception $e) {
            // Log the error but don't update cache - keep existing data
            $this->warn('Failed to update market sentiment (cache preserved): ' . $e->getMessage());
            Log::warning('Market sentiment cache update failed - existing cache preserved', [
                'error' => $e->getMessage()
            ]);
        }
        
        try {
            // Update social activity (30 days)
            $this->info('Updating social activity (30 days)...');
            $socialData30 = $this->cryptoCompareService->getSocialActivityDirect(30);
            
            $dataCount = count($socialData30['data']['historical_data']);
            $this->info("Social activity (30 days) updated successfully. Data points: " . $dataCount);
            Log::info('Social activity cache updated (30 days)', [
                'dataPoints' => $dataCount,
                'timestamp' => now()
            ]);
            
        } catch (\Exception $e) {
            $this->warn('Failed to update social activity (30 days) - cache preserved: ' . $e->getMessage());
            Log::warning('Social activity cache update failed (30 days) - existing cache preserved', [
                'error' => $e->getMessage()
            ]);
        }
        
        try {
            // Update social activity (365 days for desktop)
            $this->info('Updating social activity (365 days)...');
            $socialData365 = $this->cryptoCompareService->getSocialActivityDirect(365);
            
            $dataCount = count($socialData365['data']['historical_data']);
            $this->info("Social activity (365 days) updated successfully. Data points: " . $dataCount);
            Log::info('Social activity cache updated (365 days)', [
                'dataPoints' => $dataCount,
                'timestamp' => now()
            ]);
            
        } catch (\Exception $e) {
            $this->warn('Failed to update social activity (365 days) - cache preserved: ' . $e->getMessage());
            Log::warning('Social activity cache update failed (365 days) - existing cache preserved', [
                'error' => $e->getMessage()
            ]);
        }
        
        $this->info('Sentiment and social activity cache update completed\!');
        
        return Command::SUCCESS;
    }
}
