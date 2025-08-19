<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FREDService;
use App\Services\CacheService;
use Illuminate\Support\Facades\Log;

class UpdateEconomicDataCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'economic:update-cache {--indicator= : Specific indicator to update (federal_funds_rate, inflation_cpi, unemployment_rate, dxy_dollar_index)} {--days=365 : Number of days to fetch} {--force : Force cache refresh}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update economic indicator data cache from FRED API';

    private FREDService $fredService;
    private CacheService $cacheService;

    public function __construct(FREDService $fredService, CacheService $cacheService)
    {
        parent::__construct();
        $this->fredService = $fredService;
        $this->cacheService = $cacheService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting economic data cache update...');

        if (!$this->fredService->isConfigured()) {
            $this->error('FRED API is not configured. Please set FRED_API_KEY in your .env file.');
            return 1;
        }

        $specificIndicator = $this->option('indicator');
        $days = (int) $this->option('days');
        $force = $this->option('force');

        $indicators = [
            'federal_funds_rate' => 'Federal Funds Rate',
            'inflation_cpi' => 'Consumer Price Index',
            'unemployment_rate' => 'Unemployment Rate',
            'dxy_dollar_index' => 'US Dollar Index'
        ];

        $indicatorsToUpdate = $specificIndicator 
            ? [$specificIndicator => $indicators[$specificIndicator] ?? $specificIndicator]
            : $indicators;

        $startDate = now()->subDays($days)->format('Y-m-d');
        $endDate = now()->format('Y-m-d');

        $totalUpdated = 0;
        $totalFailed = 0;

        foreach ($indicatorsToUpdate as $indicator => $name) {
            if (!array_key_exists($indicator, $indicators)) {
                $this->warn("Unknown indicator: {$indicator}");
                $totalFailed++;
                continue;
            }

            $this->info("Updating {$name} ({$indicator})...");

            try {
                $cacheKey = "fred_series_{$this->getSeriesId($indicator)}_{$startDate}_{$endDate}";
                
                if ($force) {
                    // Clear existing cache if force flag is used
                    $this->cacheService->forget($cacheKey);
                    $this->info("Cleared existing cache for {$indicator}");
                }

                // Fetch data and cache it
                $data = $this->fetchIndicatorData($indicator, $startDate, $endDate);

                if (empty($data)) {
                    $this->warn("No data received for {$indicator}");
                    $totalFailed++;
                    continue;
                }

                // Update overlay cache keys as well
                $overlayKeys = [
                    "economic_overlay_{$indicator}_90",
                    "economic_overlay_{$indicator}_180", 
                    "economic_overlay_{$indicator}_365",
                    "economic_overlay_{$indicator}_730"
                ];

                foreach ($overlayKeys as $overlayKey) {
                    $this->cacheService->forget($overlayKey);
                }

                $this->info("✓ Updated {$name}: " . count($data) . " data points");
                $totalUpdated++;

            } catch (\Exception $e) {
                $this->error("✗ Failed to update {$name}: " . $e->getMessage());
                Log::error("Economic data update failed for {$indicator}", [
                    'error' => $e->getMessage(),
                    'indicator' => $indicator
                ]);
                $totalFailed++;
            }
        }

        // Update the general economic indicators cache
        $this->info("Updating economic indicators metadata...");
        $this->cacheService->forget('economic_indicators');
        
        $this->info("\nEconomic data cache update completed:");
        $this->info("✓ Updated: {$totalUpdated}");
        if ($totalFailed > 0) {
            $this->warn("✗ Failed: {$totalFailed}");
        }

        return $totalFailed > 0 ? 1 : 0;
    }

    /**
     * Get the FRED series ID for an indicator
     */
    private function getSeriesId($indicator)
    {
        $seriesIds = [
            'federal_funds_rate' => 'FEDFUNDS',
            'inflation_cpi' => 'CPIAUCSL',
            'unemployment_rate' => 'UNRATE',
            'dxy_dollar_index' => 'DTWEXBGS'
        ];

        return $seriesIds[$indicator] ?? $indicator;
    }

    /**
     * Fetch indicator data using the appropriate service method
     */
    private function fetchIndicatorData($indicator, $startDate, $endDate)
    {
        switch ($indicator) {
            case 'federal_funds_rate':
                return $this->fredService->getFederalFundsRate($startDate, $endDate);
            
            case 'inflation_cpi':
                return $this->fredService->getInflationCPI($startDate, $endDate);
            
            case 'unemployment_rate':
                return $this->fredService->getUnemploymentRate($startDate, $endDate);
            
            case 'dxy_dollar_index':
                return $this->fredService->getDollarIndex($startDate, $endDate);
            
            default:
                throw new \InvalidArgumentException("Unknown indicator: {$indicator}");
        }
    }
}