<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FinnhubService;
use App\Services\EconomicCalendarService;
use Illuminate\Support\Facades\Log;

class UpdateNewsFeedCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:update-news-calendar {--force : Force update even if cache is fresh}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update Redis cache for news feed and economic calendar';

    protected $finnhubService;
    protected $economicCalendarService;

    /**
     * Create a new command instance.
     */
    public function __construct(FinnhubService $finnhubService, EconomicCalendarService $economicCalendarService)
    {
        parent::__construct();
        $this->finnhubService = $finnhubService;
        $this->economicCalendarService = $economicCalendarService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting news feed and economic calendar cache update...');
        
        $startTime = microtime(true);
        $results = [
            'news' => ['status' => 'pending', 'count' => 0, 'error' => null],
            'calendar' => ['status' => 'pending', 'count' => 0, 'error' => null]
        ];
        
        // Update news feed cache
        try {
            $this->info('Updating news feed cache...');
            $newsData = $this->finnhubService->getMarketNewsDirect('crypto');
            
            // Handle CacheService response format
            $articles = isset($newsData['data']) ? $newsData['data'] : $newsData;
            if (is_array($articles)) {
                $results['news']['count'] = count($articles);
                $results['news']['status'] = 'success';
                $this->info('✓ News feed updated: ' . count($articles) . ' articles cached');
            } else {
                $results['news']['status'] = 'empty';
                $this->warn('⚠ News feed returned empty response');
            }
        } catch (\Exception $e) {
            $results['news']['status'] = 'failed';
            $results['news']['error'] = $e->getMessage();
            $this->error('✗ Failed to update news feed: ' . $e->getMessage());
            Log::error('News feed cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update economic calendar cache
        try {
            $this->info('Updating economic calendar cache...');
            
            // Get date range - from start of current year to end of next year
            $today = new \DateTime();
            $startDate = (clone $today)->modify('first day of January this year')->format('Y-m-d');
            $endDate = (clone $today)->modify('last day of December next year')->format('Y-m-d');
            
            $calendarData = $this->economicCalendarService->getEventsDirect($startDate, $endDate);
            
            if (isset($calendarData['data']) && is_array($calendarData['data'])) {
                $events = $calendarData['data'];
                $results['calendar']['count'] = count($events);
                $results['calendar']['status'] = 'success';
                $this->info('✓ Economic calendar updated: ' . count($events) . ' events cached');
            } else {
                $results['calendar']['status'] = 'empty';
                $this->warn('⚠ Economic calendar returned empty response');
            }
        } catch (\Exception $e) {
            $results['calendar']['status'] = 'failed';
            $results['calendar']['error'] = $e->getMessage();
            $this->error('✗ Failed to update economic calendar: ' . $e->getMessage());
            Log::error('Economic calendar cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        $duration = round(microtime(true) - $startTime, 2);
        
        // Display summary
        $this->info("\n" . 'Cache update completed in ' . $duration . ' seconds');
        $this->table(
            ['Component', 'Status', 'Items', 'Error'],
            [
                ['News Feed', $results['news']['status'], $results['news']['count'], $results['news']['error'] ?? '-'],
                ['Economic Calendar', $results['calendar']['status'], $results['calendar']['count'], $results['calendar']['error'] ?? '-'],
            ]
        );
        
        // Log summary
        Log::info('News and calendar cache update completed', [
            'duration' => $duration,
            'results' => $results
        ]);
        
        // Return success if at least one component updated successfully
        return ($results['news']['status'] === 'success' || $results['calendar']['status'] === 'success') 
            ? Command::SUCCESS 
            : Command::FAILURE;
    }
}
