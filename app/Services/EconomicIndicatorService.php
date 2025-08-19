<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EconomicIndicatorService
{
    private $fredService;
    private $cacheService;
    private $coinGeckoService;

    public function __construct(
        FREDService $fredService,
        CacheService $cacheService,
        CoinGeckoService $coinGeckoService
    ) {
        $this->fredService = $fredService;
        $this->cacheService = $cacheService;
        $this->coinGeckoService = $coinGeckoService;
    }

    /**
     * Economic indicator configurations
     */
    private function getIndicatorConfigs(): array
    {
        return [
            'federal_funds_rate' => [
                'name' => 'Federal Funds Rate',
                'description' => 'The interest rate at which banks lend to each other overnight',
                'unit' => '%',
                'color' => '#FF6B6B',
                'fred_series' => 'FEDFUNDS',
                'frequency' => 'm'
            ],
            'inflation_cpi' => [
                'name' => 'Consumer Price Index (Inflation)',
                'description' => 'Year-over-year inflation rate based on consumer prices',
                'unit' => '%',
                'color' => '#4ECDC4',
                'fred_series' => 'CPIAUCSL',
                'frequency' => 'm',
                'calculation' => 'yoy_percentage'
            ],
            'unemployment_rate' => [
                'name' => 'Unemployment Rate',
                'description' => 'Percentage of labor force that is unemployed',
                'unit' => '%',
                'color' => '#45B7D1',
                'fred_series' => 'UNRATE',
                'frequency' => 'm'
            ],
            'dxy_dollar_index' => [
                'name' => 'DXY Dollar Index',
                'description' => 'Trade-weighted US Dollar index vs major currencies',
                'unit' => '',
                'color' => '#96CEB4',
                'fred_series' => 'DTWEXBGS',
                'frequency' => 'd'
            ],
            'treasury_10y' => [
                'name' => '10-Year Treasury Yield',
                'description' => 'Interest rate on 10-year US Treasury bonds',
                'unit' => '%',
                'color' => '#FFD93D',
                'fred_series' => 'DGS10',
                'frequency' => 'd'
            ],
            'money_supply_m2' => [
                'name' => 'M2 Money Supply Growth',
                'description' => 'Year-over-year growth in M2 money supply',
                'unit' => '%',
                'color' => '#F38BA8',
                'fred_series' => 'M2SL',
                'frequency' => 'm',
                'calculation' => 'yoy_percentage'
            ]
        ];
    }

    /**
     * Get economic overlay data for a specific indicator
     */
    public function getEconomicOverlayData(string $indicator, int $days = 730): array
    {
        $cacheKey = "economic_overlay_{$indicator}_{$days}";
        
        return $this->cacheService->remember($cacheKey, 1800, function () use ($indicator, $days) {
            $config = $this->getIndicatorConfigs()[$indicator] ?? null;
            
            if (!$config) {
                throw new \Exception("Unknown economic indicator: {$indicator}");
            }

            // Get Bitcoin price data (using existing method)
            $bitcoinData = $this->getBitcoinPriceData($days);
            
            // Get economic indicator data
            $economicData = $this->getEconomicIndicatorData($indicator, $days);
            
            if (empty($bitcoinData) || empty($economicData)) {
                return [
                    'data' => [],
                    'metadata' => [
                        'indicator' => $indicator,
                        'days' => $days,
                        'error' => 'Insufficient data available'
                    ]
                ];
            }

            // Combine and align data
            $combinedData = $this->alignTimeSeriesData($bitcoinData, $economicData, $indicator);
            
            // Calculate correlation
            $correlation = $this->calculateCorrelation($combinedData);
            
            // Add correlation zones and events
            $enhancedData = $this->addCorrelationAnalysis($combinedData, $correlation);
            
            return [
                'data' => $enhancedData,
                'metadata' => [
                    'indicator' => $indicator,
                    'indicator_config' => $config,
                    'days' => $days,
                    'data_points' => count($enhancedData),
                    'correlation' => $correlation,
                    'correlation_strength' => $this->getCorrelationStrength($correlation),
                    'last_updated' => now()->toISOString()
                ]
            ];
        });
    }

    /**
     * Get Bitcoin price data for the specified period
     */
    private function getBitcoinPriceData(int $days): array
    {
        try {
            // Use existing CoinGecko service to get Bitcoin historical data
            $response = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', $days);
            
            // Handle CacheService format - data might be wrapped
            $marketData = isset($response['data']) ? $response['data'] : $response;
            
            if (empty($marketData['prices'])) {
                Log::warning('No Bitcoin price data found for economic overlay', [
                    'days' => $days,
                    'response_keys' => array_keys($marketData)
                ]);
                return [];
            }

            $priceData = [];
            foreach ($marketData['prices'] as $price) {
                $priceData[] = [
                    'date' => Carbon::createFromTimestampMs($price[0])->format('Y-m-d'),
                    'bitcoin_price' => $price[1]
                ];
            }

            Log::info('Retrieved Bitcoin price data for economic overlay', [
                'days' => $days,
                'data_points' => count($priceData)
            ]);

            return $priceData;
        } catch (\Exception $e) {
            Log::error('Failed to get Bitcoin price data for economic overlay', [
                'error' => $e->getMessage(),
                'days' => $days
            ]);
            return [];
        }
    }

    /**
     * Get economic indicator data
     */
    private function getEconomicIndicatorData(string $indicator, int $days): array
    {
        $config = $this->getIndicatorConfigs()[$indicator];
        
        try {
            $response = match ($indicator) {
                'federal_funds_rate' => $this->fredService->getFederalFundsRateData($days),
                'inflation_cpi' => $this->fredService->getInflationData($days),
                'unemployment_rate' => $this->fredService->getUnemploymentRateData($days),
                'dxy_dollar_index' => $this->fredService->getDXYData($days),
                'treasury_10y' => $this->fredService->getTreasuryYieldData('DGS10', $days),
                'money_supply_m2' => $this->fredService->getMoneySupplyData($days),
                default => $this->fredService->getSeriesData(
                    $config['fred_series'], 
                    $days, 
                    $config['frequency']
                )
            };
            
            // Handle CacheService format - data might be wrapped
            $economicData = isset($response['data']) ? $response['data'] : $response;
            
            if (empty($economicData) || !is_array($economicData)) {
                Log::warning('No economic indicator data found', [
                    'indicator' => $indicator,
                    'days' => $days,
                    'response_type' => gettype($response)
                ]);
                return [];
            }

            Log::info('Retrieved economic indicator data', [
                'indicator' => $indicator,
                'days' => $days,
                'data_points' => count($economicData)
            ]);

            return $economicData;
            
        } catch (\Exception $e) {
            Log::error('Failed to get economic indicator data', [
                'indicator' => $indicator,
                'days' => $days,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Align Bitcoin price data with economic indicator data by date
     */
    private function alignTimeSeriesData(array $bitcoinData, array $economicData, string $indicator): array
    {
        $alignedData = [];
        $economicIndex = [];
        
        // Index economic data by date for faster lookup
        foreach ($economicData as $item) {
            $economicIndex[$item['date']] = $item['value'];
        }

        // For each Bitcoin price point, find the closest economic data
        foreach ($bitcoinData as $btcItem) {
            $date = $btcItem['date'];
            $economicValue = null;

            // Try exact date match first
            if (isset($economicIndex[$date])) {
                $economicValue = $economicIndex[$date];
            } else {
                // Find closest date (for monthly data matched with daily Bitcoin data)
                $economicValue = $this->findClosestEconomicValue($date, $economicIndex);
            }

            if ($economicValue !== null) {
                $alignedData[] = [
                    'date' => $date,
                    'bitcoin_price' => $btcItem['bitcoin_price'],
                    $indicator => $economicValue
                ];
            }
        }

        return $alignedData;
    }

    /**
     * Find the closest economic indicator value for a given date
     */
    private function findClosestEconomicValue(string $targetDate, array $economicIndex): ?float
    {
        $target = Carbon::parse($targetDate);
        $closestValue = null;
        $smallestDiff = PHP_INT_MAX;

        foreach ($economicIndex as $date => $value) {
            $economicDate = Carbon::parse($date);
            $diff = abs($target->diffInDays($economicDate));
            
            if ($diff < $smallestDiff) {
                $smallestDiff = $diff;
                $closestValue = $value;
            }
            
            // If we find a perfect match or very close, use it
            if ($diff <= 15) { // Within 15 days is acceptable
                break;
            }
        }

        return $closestValue;
    }

    /**
     * Calculate Pearson correlation coefficient between Bitcoin price and economic indicator
     */
    private function calculateCorrelation(array $data): float
    {
        if (count($data) < 2) {
            return 0.0;
        }

        $bitcoinPrices = array_column($data, 'bitcoin_price');
        $economicValues = [];
        
        // Get economic indicator values (the key that's not 'date' or 'bitcoin_price')
        foreach ($data as $item) {
            foreach ($item as $key => $value) {
                if ($key !== 'date' && $key !== 'bitcoin_price') {
                    $economicValues[] = $value;
                    break;
                }
            }
        }

        if (empty($economicValues) || count($bitcoinPrices) !== count($economicValues)) {
            return 0.0;
        }

        return $this->pearsonCorrelation($bitcoinPrices, $economicValues);
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    private function pearsonCorrelation(array $x, array $y): float
    {
        $n = count($x);
        if ($n !== count($y) || $n === 0) {
            return 0.0;
        }

        $sumX = array_sum($x);
        $sumY = array_sum($y);
        $sumXX = array_sum(array_map(fn($val) => $val * $val, $x));
        $sumYY = array_sum(array_map(fn($val) => $val * $val, $y));
        $sumXY = 0;

        for ($i = 0; $i < $n; $i++) {
            $sumXY += $x[$i] * $y[$i];
        }

        $numerator = ($n * $sumXY) - ($sumX * $sumY);
        $denominator = sqrt((($n * $sumXX) - ($sumX * $sumX)) * (($n * $sumYY) - ($sumY * $sumY)));

        if ($denominator == 0) {
            return 0.0;
        }

        return $numerator / $denominator;
    }

    /**
     * Get correlation strength description
     */
    private function getCorrelationStrength(float $correlation): string
    {
        $abs = abs($correlation);
        
        if ($abs >= 0.8) return 'very_strong';
        if ($abs >= 0.6) return 'strong';
        if ($abs >= 0.4) return 'moderate';
        if ($abs >= 0.2) return 'weak';
        return 'very_weak';
    }

    /**
     * Add correlation analysis to the combined data
     */
    private function addCorrelationAnalysis(array $data, float $overallCorrelation): array
    {
        // Add rolling correlation for each point
        $windowSize = min(30, max(10, count($data) / 10)); // Dynamic window size
        
        foreach ($data as $index => &$item) {
            // Calculate rolling correlation for context
            $startIndex = max(0, $index - $windowSize);
            $endIndex = min(count($data), $index + $windowSize);
            $window = array_slice($data, $startIndex, $endIndex - $startIndex);
            
            $item['correlation'] = count($window) > 5 ? $this->calculateCorrelation($window) : $overallCorrelation;
            $item['correlation_strength'] = $this->getCorrelationStrength($item['correlation']);
            
            // Add trend indicators
            if ($index > 0) {
                $prevPrice = $data[$index - 1]['bitcoin_price'];
                $item['price_change_pct'] = (($item['bitcoin_price'] - $prevPrice) / $prevPrice) * 100;
            } else {
                $item['price_change_pct'] = 0;
            }
        }

        return $data;
    }

    /**
     * Get available economic indicators
     */
    public function getAvailableIndicators(): array
    {
        return $this->getIndicatorConfigs();
    }

    /**
     * Get correlation summary for multiple indicators
     */
    public function getCorrelationSummary(int $days = 365): array
    {
        $indicators = $this->getIndicatorConfigs();
        $summary = [];
        
        foreach ($indicators as $key => $config) {
            try {
                $data = $this->getEconomicOverlayData($key, $days);
                $summary[$key] = [
                    'name' => $config['name'],
                    'correlation' => $data['metadata']['correlation'] ?? 0,
                    'strength' => $data['metadata']['correlation_strength'] ?? 'unknown',
                    'data_points' => $data['metadata']['data_points'] ?? 0,
                    'color' => $config['color']
                ];
            } catch (\Exception $e) {
                Log::warning("Failed to get correlation for {$key}: " . $e->getMessage());
                $summary[$key] = [
                    'name' => $config['name'],
                    'correlation' => 0,
                    'strength' => 'unavailable',
                    'data_points' => 0,
                    'color' => $config['color']
                ];
            }
        }
        
        return $summary;
    }
}