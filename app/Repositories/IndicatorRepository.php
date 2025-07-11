<?php

namespace App\Repositories;

use App\Services\CacheService;
use App\Services\CoinGeckoService;
use App\Services\CryptoCompareService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IndicatorRepository extends BaseRepository
{
    private CoinGeckoService $coinGeckoService;
    private ?CryptoCompareService $cryptoCompareService;
    
    // Rainbow Chart Constants - Bitcoin Power Law Model
    private const GENESIS_DATE = '2009-01-09';
    private const POWER_LAW_EXPONENT = 5.82;  // The power (slope in log-log space)
    private const POWER_LAW_INTERCEPT = -17.01;  // Y-intercept in log-log space
    
    // Band offsets from the power law line (in log10 space)
    private const BAND_OFFSETS = [
        'band9' => 0.50,   // Dark Red - Maximum Bubble Territory (3.16x above fair value)
        'band8' => 0.40,   // Red - Sell. Seriously, SELL! (2.51x above)
        'band7' => 0.30,   // Orange - FOMO Intensifies (2x above)
        'band6' => 0.20,   // Light Orange - Is this a bubble? (1.58x above)
        'band5' => 0.10,   // Yellow - HODL! (1.26x above)
        'band4' => 0.0,    // Light Green - Fair Value (power law line)
        'band3' => -0.10,  // Green - Still Cheap (0.79x below)
        'band2' => -0.20,  // Light Blue - Accumulate (0.63x below)
        'band1' => -0.38,  // Blue - Fire Sale (0.42x below - historical bottom)
    ];
    
    // Band labels
    private const BAND_LABELS = [
        'band1' => 'Fire Sale',
        'band2' => 'Accumulate',
        'band3' => 'Still Cheap',
        'band4' => 'Fair Value',
        'band5' => 'HODL!',
        'band6' => 'Is this a bubble?',
        'band7' => 'FOMO Intensifies',
        'band8' => 'Sell. Seriously, SELL!',
        'band9' => 'Maximum Bubble Territory',
    ];
    
    // Band colors
    private const BAND_COLORS = [
        'band1' => '#0D47A1',  // Dark Blue
        'band2' => '#1976D2',  // Blue
        'band3' => '#42A5F5',  // Light Blue
        'band4' => '#4CAF50',  // Green
        'band5' => '#FFEB3B',  // Yellow
        'band6' => '#FFB74D',  // Light Orange
        'band7' => '#FF9800',  // Orange
        'band8' => '#F44336',  // Red
        'band9' => '#B71C1C',  // Dark Red
    ];

    public function __construct(
        CacheService $cacheService,
        CoinGeckoService $coinGeckoService,
        ?CryptoCompareService $cryptoCompareService = null
    ) {
        parent::__construct($cacheService);
        $this->coinGeckoService = $coinGeckoService;
        $this->cryptoCompareService = $cryptoCompareService;
    }

    /**
     * Get the cache prefix for indicators
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'indicators';
    }

    /**
     * Calculate RSI (Relative Strength Index)
     * Note: In Phase 1, this just provides structure. Logic will be moved in Phase 2.
     *
     * @param array $prices
     * @param int $period
     * @return float|null
     */
    public function calculateRSI(array $prices, int $period = 14): ?float
    {
        $this->logOperation('calculateRSI', ['period' => $period, 'priceCount' => count($prices)]);
        
        // Placeholder for Phase 2 implementation
        return null;
    }

    /**
     * Calculate moving averages
     *
     * @param array $prices
     * @param int $period
     * @return float|null
     */
    public function calculateMovingAverage(array $prices, int $period): ?float
    {
        $this->logOperation('calculateMovingAverage', ['period' => $period]);
        
        // Placeholder for Phase 2 implementation
        if (count($prices) < $period) {
            return null;
        }
        
        return null;
    }

    /**
     * Get Pi Cycle Top indicator data
     *
     * @return array
     */
    public function getPiCycleTopData(): array
    {
        $this->logOperation('getPiCycleTopData');
        
        $cacheKey = "pi_cycle_top_bitcoin_v2";
        
        return $this->cacheService->rememberWithoutFreshness($cacheKey, function () {
            try {
                // Try to get historical data from multiple sources
                $dailyPrices = [];
                
                // First, try to get historical data from CryptoCompare (if available)
                if ($this->cryptoCompareService) {
                    try {
                        $historicalData = $this->fetchCryptoCompareHistory();
                        if (!empty($historicalData)) {
                            $dailyPrices = $historicalData;
                            \Log::info("Got " . count($dailyPrices) . " days from CryptoCompare");
                        }
                    } catch (\Exception $e) {
                        \Log::warning("CryptoCompare failed: " . $e->getMessage());
                    }
                }
                
                // If CryptoCompare fails, fall back to CoinGecko
                if (empty($dailyPrices)) {
                    try {
                        // Get maximum available data (365 days for free tier)
                        $marketData = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', 365, 'daily');
                        
                        if (!empty($marketData['prices'])) {
                            foreach ($marketData['prices'] as $pricePoint) {
                                $timestamp = $pricePoint[0] / 1000;
                                $dailyPrices[] = [
                                    'date' => date('Y-m-d', $timestamp),
                                    'timestamp' => $timestamp,
                                    'price' => $pricePoint[1]
                                ];
                            }
                            \Log::info("Got " . count($dailyPrices) . " days of price data from CoinGecko");
                        }
                    } catch (\Exception $e) {
                        \Log::warning("Market chart failed, trying OHLC: " . $e->getMessage());
                    }
                }
                
                // If market chart fails or has no data, try OHLC
                if (empty($dailyPrices)) {
                    $ohlcResult = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 365);
                    $ohlcData = $ohlcResult['data'] ?? $ohlcResult; // Handle both wrapped and raw responses
                    
                    if (!empty($ohlcData) && is_array($ohlcData)) {
                        foreach ($ohlcData as $candle) {
                            if (is_array($candle) && count($candle) >= 5) {
                                $timestamp = $candle[0] / 1000;
                                $dailyPrices[] = [
                                    'date' => date('Y-m-d', $timestamp),
                                    'timestamp' => $timestamp,
                                    'price' => $candle[4] // close price
                                ];
                            }
                        }
                        \Log::info("Got " . count($dailyPrices) . " days of price data from OHLC");
                    }
                }
                
                if (empty($dailyPrices)) {
                    \Log::error("No price data available for Pi Cycle Top");
                    return [];
                }
                
                // Sort by date
                usort($dailyPrices, function($a, $b) {
                    return $a['timestamp'] - $b['timestamp'];
                });
                
                // Calculate moving averages
                $result = [];
                $lastCrossover = null;
                $previousMa111AboveMa350x2 = null;
                
                foreach ($dailyPrices as $index => $day) {
                    $dataPoint = [
                        'date' => $day['date'],
                        'price' => round($day['price'], 2),
                        'ma111' => null,
                        'ma350x2' => null,
                        'isCrossover' => false
                    ];
                    
                    // Calculate 111 DMA
                    if ($index >= 110) {
                        $sum = 0;
                        for ($i = $index - 110; $i <= $index; $i++) {
                            $sum += $dailyPrices[$i]['price'];
                        }
                        $dataPoint['ma111'] = round($sum / 111, 2);
                    }
                    
                    // Calculate 350 DMA x 2
                    if ($index >= 349) {
                        $sum = 0;
                        for ($i = $index - 349; $i <= $index; $i++) {
                            $sum += $dailyPrices[$i]['price'];
                        }
                        $ma350 = $sum / 350;
                        $dataPoint['ma350x2'] = round($ma350 * 2, 2);
                        
                        // Check for crossover
                        if ($dataPoint['ma111'] !== null && $previousMa111AboveMa350x2 !== null) {
                            $currentMa111AboveMa350x2 = $dataPoint['ma111'] > $dataPoint['ma350x2'];
                            
                            if ($previousMa111AboveMa350x2 && !$currentMa111AboveMa350x2) {
                                // Crossover detected (111 DMA crossed below 350 DMA x 2)
                                $dataPoint['isCrossover'] = true;
                                $lastCrossover = $day['date'];
                            }
                            
                            $previousMa111AboveMa350x2 = $currentMa111AboveMa350x2;
                        } elseif ($dataPoint['ma111'] !== null && $previousMa111AboveMa350x2 === null) {
                            $previousMa111AboveMa350x2 = $dataPoint['ma111'] > $dataPoint['ma350x2'];
                        }
                    }
                    
                    $result[] = $dataPoint;
                }
                
                // Determine current status
                $currentStatus = 'unknown';
                if (!empty($result)) {
                    $lastDataPoint = end($result);
                    if ($lastDataPoint['ma111'] !== null && $lastDataPoint['ma350x2'] !== null) {
                        $currentStatus = $lastDataPoint['ma111'] > $lastDataPoint['ma350x2'] ? 'above' : 'below';
                    }
                }
                
                return [
                    'data' => $result,
                    'metadata' => [
                        'last_crossover' => $lastCrossover,
                        'current_status' => $currentStatus
                    ]
                ];
                
            } catch (\Exception $e) {
                \Log::error('Pi Cycle Top calculation error: ' . $e->getMessage());
                return [];
            }
        });
    }

    /**
     * Get Bull Market Support Band data
     *
     * @param string $coinId
     * @param string $vsCurrency
     * @param int $days
     * @return array
     */
    public function getBullMarketBandData(string $coinId = 'bitcoin', string $vsCurrency = 'usd', int $days = 365): array
    {
        $this->logOperation('getBullMarketBandData', [
            'coinId' => $coinId,
            'days' => $days
        ]);
        
        // Placeholder for Phase 2 implementation
        return [
            'prices' => [],
            'sma_20w' => [],
            'ema_21w' => [],
            'labels' => []
        ];
    }


    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     *
     * @param array $prices
     * @param int $fastPeriod
     * @param int $slowPeriod
     * @param int $signalPeriod
     * @return array
     */
    public function calculateMACD(
        array $prices, 
        int $fastPeriod = 12, 
        int $slowPeriod = 26, 
        int $signalPeriod = 9
    ): array {
        $this->logOperation('calculateMACD', [
            'fastPeriod' => $fastPeriod,
            'slowPeriod' => $slowPeriod,
            'signalPeriod' => $signalPeriod
        ]);
        
        // Placeholder for Phase 2 implementation
        return [
            'macd' => [],
            'signal' => [],
            'histogram' => []
        ];
    }

    /**
     * Validate indicator data
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Different validation based on indicator type
        // For now, just check it's not empty
        return !empty($data);
    }

    /**
     * Calculate multiple indicators at once
     *
     * @param array $priceData
     * @param array $indicators
     * @return array
     */
    public function calculateMultipleIndicators(array $priceData, array $indicators): array
    {
        $results = [];
        
        foreach ($indicators as $indicator => $params) {
            switch ($indicator) {
                case 'rsi':
                    $results['rsi'] = $this->calculateRSI($priceData, $params['period'] ?? 14);
                    break;
                case 'sma':
                    $results['sma'] = $this->calculateMovingAverage($priceData, $params['period'] ?? 20);
                    break;
                case 'ema':
                    // Placeholder for EMA calculation
                    $results['ema'] = null;
                    break;
                case 'macd':
                    $results['macd'] = $this->calculateMACD($priceData);
                    break;
            }
        }
        
        return $results;
    }
    
    /**
     * Fetch historical data from CryptoCompare
     *
     * @return array
     */
    private function fetchCryptoCompareHistory(): array
    {
        if (!$this->cryptoCompareService) {
            return [];
        }
        
        try {
            $url = 'https://min-api.cryptocompare.com/data/v2/histoday';
            $params = [
                'fsym' => 'BTC',
                'tsym' => 'USD',
                'limit' => 2000, // Maximum allowed by free tier
                'aggregate' => 1,
                'api_key' => config('services.cryptocompare.key')
            ];
            
            $response = \Http::timeout(30)->get($url, $params);
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Data']['Data']) && is_array($data['Data']['Data'])) {
                    $dailyPrices = [];
                    
                    foreach ($data['Data']['Data'] as $day) {
                        if (isset($day['time']) && isset($day['close'])) {
                            $dailyPrices[] = [
                                'date' => date('Y-m-d', $day['time']),
                                'timestamp' => $day['time'],
                                'price' => $day['close']
                            ];
                        }
                    }
                    
                    // Sort by date ascending
                    usort($dailyPrices, function($a, $b) {
                        return $a['timestamp'] - $b['timestamp'];
                    });
                    
                    return $dailyPrices;
                }
            }
            
            return [];
        } catch (\Exception $e) {
            \Log::warning('Failed to fetch CryptoCompare history: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get rainbow chart data with calculated bands
     */
    public function getRainbowChartData(string $days = 'max'): array
    {
        try {
            // Get historical data (cached FOREVER since historical prices never change)
            $historicalKey = "rainbow_chart_historical_v2";
            $historicalResult = $this->cacheService->rememberHistoricalForever($historicalKey, function($fromDate, $toDate) {
                $allPrices = [];
                
                // First try CryptoCompare for maximum historical data
                if ($this->cryptoCompareService) {
                    try {
                        $historicalData = $this->cryptoCompareService->getHistoricalDailyPrices('BTC', 'USD', 2000);
                        
                        if (isset($historicalData['data']['Data']['Data'])) {
                            foreach ($historicalData['data']['Data']['Data'] as $day) {
                                if (isset($day['time']) && isset($day['close']) && $day['close'] > 0) {
                                    $allPrices[$day['time'] * 1000] = [
                                        'timestamp' => $day['time'] * 1000,
                                        'price' => $day['close']
                                    ];
                                }
                            }
                            Log::info("Rainbow Chart Historical: Got " . count($allPrices) . " days from CryptoCompare");
                        }
                    } catch (\Exception $e) {
                        Log::warning("CryptoCompare failed for Rainbow Chart Historical: " . $e->getMessage());
                    }
                }
                
                // If we don't have enough data, try CoinGecko
                if (count($allPrices) < 365) {
                    try {
                        $maxResult = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', 'max');
                        
                        if (isset($maxResult['data']['prices'])) {
                            foreach ($maxResult['data']['prices'] as $pricePoint) {
                                $timestamp = $pricePoint[0];
                                $allPrices[$timestamp] = [
                                    'timestamp' => $timestamp,
                                    'price' => $pricePoint[1]
                                ];
                            }
                            Log::info("Rainbow Chart Historical: Got " . count($allPrices) . " days from CoinGecko");
                        }
                    } catch (\Exception $e) {
                        Log::warning('CoinGecko failed for Rainbow Chart Historical: ' . $e->getMessage());
                    }
                }
                
                // Sort by timestamp and convert to daily data
                ksort($allPrices);
                
                $result = ['prices' => []];
                foreach ($allPrices as $priceData) {
                    $result['prices'][] = [
                        $priceData['timestamp'],
                        $priceData['price']
                    ];
                }
                
                return $result;
            }, 'timestamp');
            
            // Extract historical data
            $historicalPrices = $historicalResult['data']['prices'] ?? [];
            
            // Get recent data to fill any gaps
            $recentKey = "rainbow_chart_recent_{$days}";
            $recentData = $this->cacheService->remember($recentKey, 300, function() use ($days) {
                try {
                    $result = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', $days);
                    return $result['data'] ?? [];
                } catch (\Exception $e) {
                    Log::warning('Failed to get recent rainbow chart data: ' . $e->getMessage());
                    return ['prices' => []];
                }
            });
            
            $recentPrices = $recentData['data']['prices'] ?? [];
            
            // Merge and deduplicate
            $allPrices = [];
            foreach ($historicalPrices as $pricePoint) {
                $timestamp = $pricePoint[0];
                $allPrices[$timestamp] = $pricePoint[1];
            }
            foreach ($recentPrices as $pricePoint) {
                $timestamp = $pricePoint[0];
                $allPrices[$timestamp] = $pricePoint[1];
            }
            
            // Sort by timestamp
            ksort($allPrices);
            
            // Process data with rainbow bands
            $genesisDate = Carbon::parse(self::GENESIS_DATE);
            $processedData = [];
            
            foreach ($allPrices as $timestamp => $price) {
                $date = Carbon::createFromTimestampMs($timestamp);
                $daysSinceGenesis = $genesisDate->diffInDays($date);
                
                // Skip if before genesis
                if ($daysSinceGenesis < 1) {
                    continue;
                }
                
                // Calculate rainbow bands
                $bands = $this->calculateRainbowBands($daysSinceGenesis);
                
                // Determine current band
                $currentBand = $this->getCurrentBand($price, $bands);
                
                $dataPoint = [
                    'date' => $date->format('Y-m-d'),
                    'timestamp' => $timestamp,
                    'price' => round($price, 2),
                    'daysSinceGenesis' => $daysSinceGenesis,
                    'currentBand' => $currentBand,
                    'bands' => $bands
                ];
                
                $processedData[] = $dataPoint;
            }
            
            // Filter by days if not 'max'
            if ($days !== 'max') {
                $daysToShow = intval($days);
                $cutoffTime = time() * 1000 - ($daysToShow * 24 * 60 * 60 * 1000);
                $processedData = array_filter($processedData, function($item) use ($cutoffTime) {
                    return $item['timestamp'] >= $cutoffTime;
                });
                $processedData = array_values($processedData);
            }
            
            return [
                'data' => $processedData,
                'metadata' => [
                    'bandLabels' => self::BAND_LABELS,
                    'bandColors' => self::BAND_COLORS,
                    'lastUpdate' => now()->toIso8601String(),
                    'dataPoints' => count($processedData),
                    'powerLaw' => [
                        'exponent' => self::POWER_LAW_EXPONENT,
                        'intercept' => self::POWER_LAW_INTERCEPT
                    ]
                ]
            ];
            
        } catch (\Exception $e) {
            Log::error('Rainbow chart data error: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Calculate rainbow bands for a given number of days since genesis
     */
    private function calculateRainbowBands(int $daysSinceGenesis): array
    {
        // Ensure we have valid days (minimum 1 day)
        if ($daysSinceGenesis <= 0) {
            $daysSinceGenesis = 1;
        }
        
        // Calculate the power law value (in log10 space)
        $logFairValue = self::POWER_LAW_INTERCEPT + self::POWER_LAW_EXPONENT * log10($daysSinceGenesis);
        
        $bands = [];
        foreach (self::BAND_OFFSETS as $band => $offset) {
            // Add the offset to create each band (in log10 space)
            $logBandValue = $logFairValue + $offset;
            
            // Convert back from log10 to actual price
            $bandPrice = pow(10, $logBandValue);
            
            // Round to reasonable precision
            if ($bandPrice < 1) {
                $bands[$band] = round($bandPrice, 4);
            } elseif ($bandPrice < 100) {
                $bands[$band] = round($bandPrice, 2);
            } elseif ($bandPrice < 10000) {
                $bands[$band] = round($bandPrice, 0);
            } else {
                $bands[$band] = round($bandPrice / 1000, 0) * 1000; // Round to nearest 1000
            }
        }
        
        // Ensure bands are in ascending order
        asort($bands);
        
        return $bands;
    }
    
    /**
     * Determine which band the current price falls into
     */
    private function getCurrentBand(float $price, array $bands): string
    {
        // Start from the highest band and work down
        $bandNames = array_reverse(array_keys(self::BAND_OFFSETS));
        
        foreach ($bandNames as $band) {
            if (isset($bands[$band]) && $price >= $bands[$band]) {
                return $band;
            }
        }
        
        // If price is below all bands, return the lowest band
        return 'band1';
    }
    
    /**
     * Get current rainbow chart status
     */
    public function getRainbowChartStatus(): array
    {
        $cacheKey = "rainbow_chart_current_status";
        
        $result = $this->cacheService->remember($cacheKey, 300, function () {
            try {
                // Get current Bitcoin price
                $priceResult = $this->coinGeckoService->getSimplePrice('bitcoin', 'usd');
                $priceData = $priceResult['data'] ?? [];
                $currentPrice = $priceData['bitcoin']['usd'] ?? 0;
                
                if ($currentPrice <= 0) {
                    throw new \Exception('Invalid current price');
                }
                
                // Calculate days since genesis
                $genesisDate = Carbon::parse(self::GENESIS_DATE);
                $daysSinceGenesis = $genesisDate->diffInDays(now());
                
                // Calculate current bands
                $bands = $this->calculateRainbowBands($daysSinceGenesis);
                
                // Determine current band
                $currentBand = $this->getCurrentBand($currentPrice, $bands);
                
                // Calculate position within band (0-100%)
                $bandKeys = array_keys($bands);
                $currentBandIndex = array_search($currentBand, $bandKeys);
                
                $lowerBound = $bands[$currentBand];
                $upperBound = ($currentBandIndex < count($bandKeys) - 1) 
                    ? $bands[$bandKeys[$currentBandIndex + 1]] 
                    : $lowerBound * 1.25; // 25% above for top band
                
                $positionInBand = (($currentPrice - $lowerBound) / ($upperBound - $lowerBound)) * 100;
                
                return [
                    'price' => round($currentPrice, 2),
                    'daysSinceGenesis' => $daysSinceGenesis,
                    'currentBand' => $currentBand,
                    'bandLabel' => self::BAND_LABELS[$currentBand],
                    'bandColor' => self::BAND_COLORS[$currentBand],
                    'positionInBand' => round($positionInBand, 1),
                    'bands' => $bands,
                    'fairValue' => round($bands['band4'], 2), // Fair value is band4
                    'deviationFromFairValue' => round((($currentPrice / $bands['band4']) - 1) * 100, 1), // % deviation
                    'lastUpdate' => now()->toIso8601String()
                ];
                
            } catch (\Exception $e) {
                Log::error('Rainbow chart status error: ' . $e->getMessage());
                throw $e;
            }
        });
        
        return $result['data'] ?? $result;
    }
}