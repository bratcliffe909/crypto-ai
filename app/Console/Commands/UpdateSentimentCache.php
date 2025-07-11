<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Repositories\SentimentRepository;
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
    protected $description = 'Update market sentiment and social activity cache from APIs';

    private SentimentRepository $sentimentRepository;

    /**
     * Create a new command instance.
     */
    public function __construct(SentimentRepository $sentimentRepository)
    {
        parent::__construct();
        $this->sentimentRepository = $sentimentRepository;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting sentiment cache update...');
        
        $startTime = microtime(true);
        $updates = [
            'fear_greed' => false,
            'market_sentiment' => false,
            'social_activity_30' => false,
            'social_activity_365' => false
        ];
        
        // Update Fear & Greed Index
        try {
            $this->info('Updating Fear & Greed Index...');
            $fearGreedData = $this->sentimentRepository->getFearGreedIndexDirect(30);
            
            if (isset($fearGreedData['data']['data'][0]['value'])) {
                $currentValue = $fearGreedData['data']['data'][0]['value'];
                $this->info("Fear & Greed Index updated successfully. Current value: {$currentValue}");
                $updates['fear_greed'] = true;
            }
        } catch (\Exception $e) {
            $this->warn('Failed to update Fear & Greed Index: ' . $e->getMessage());
            Log::warning('Fear & Greed Index update failed', ['error' => $e->getMessage()]);
        }
        
        // Update market sentiment
        try {
            $this->info('Updating market sentiment...');
            $sentimentData = $this->sentimentRepository->getMarketSentimentDirect();
            
            if (isset($sentimentData['data']['sentiment_score'])) {
                $score = $sentimentData['data']['sentiment_score'];
                $this->info("Market sentiment updated successfully. Score: {$score}");
                $updates['market_sentiment'] = true;
            }
        } catch (\Exception $e) {
            $this->warn('Failed to update market sentiment: ' . $e->getMessage());
            Log::warning('Market sentiment update failed', ['error' => $e->getMessage()]);
        }
        
        // Update social activity (30 days)
        try {
            $this->info('Updating social activity (30 days)...');
            $socialData30 = $this->sentimentRepository->getSocialActivityDirect(30);
            
            if (isset($socialData30['data']['historical_data'])) {
                $dataCount = count($socialData30['data']['historical_data']);
                $this->info("Social activity (30 days) updated successfully. Data points: {$dataCount}");
                $updates['social_activity_30'] = true;
            }
        } catch (\Exception $e) {
            $this->warn('Failed to update social activity (30 days): ' . $e->getMessage());
            Log::warning('Social activity update failed (30 days)', ['error' => $e->getMessage()]);
        }
        
        // Update social activity (365 days for desktop)
        try {
            $this->info('Updating social activity (365 days)...');
            $socialData365 = $this->sentimentRepository->getSocialActivityDirect(365);
            
            if (isset($socialData365['data']['historical_data'])) {
                $dataCount = count($socialData365['data']['historical_data']);
                $this->info("Social activity (365 days) updated successfully. Data points: {$dataCount}");
                $updates['social_activity_365'] = true;
            }
        } catch (\Exception $e) {
            $this->warn('Failed to update social activity (365 days): ' . $e->getMessage());
            Log::warning('Social activity update failed (365 days)', ['error' => $e->getMessage()]);
        }
        
        // Calculate aggregated sentiment
        try {
            $this->info('Calculating aggregated sentiment...');
            $aggregated = $this->sentimentRepository->calculateAggregatedSentiment();
            
            if (isset($aggregated['overall_sentiment'])) {
                $this->info("Aggregated sentiment: {$aggregated['overall_sentiment']} ({$aggregated['sentiment_label']})");
            }
        } catch (\Exception $e) {
            $this->warn('Failed to calculate aggregated sentiment: ' . $e->getMessage());
        }
        
        $duration = round(microtime(true) - $startTime, 2);
        $successCount = count(array_filter($updates));
        $totalCount = count($updates);
        
        $this->info("Sentiment cache update completed in {$duration} seconds");
        $this->info("Successfully updated: {$successCount}/{$totalCount} data sources");
        
        // Display summary table
        $this->table(
            ['Data Source', 'Status'],
            [
                ['Fear & Greed Index', $updates['fear_greed'] ? '✓ Updated' : '✗ Failed'],
                ['Market Sentiment', $updates['market_sentiment'] ? '✓ Updated' : '✗ Failed'],
                ['Social Activity (30d)', $updates['social_activity_30'] ? '✓ Updated' : '✗ Failed'],
                ['Social Activity (365d)', $updates['social_activity_365'] ? '✓ Updated' : '✗ Failed'],
            ]
        );
        
        Log::info('Sentiment cache update completed', [
            'duration' => $duration,
            'updates' => $updates,
            'timestamp' => now()
        ]);
        
        return Command::SUCCESS;
    }
}
