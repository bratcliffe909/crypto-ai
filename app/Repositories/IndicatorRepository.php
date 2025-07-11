<?php

namespace App\Repositories;

use App\Services\CacheService;
use App\Services\CoinGeckoService;
use App\Services\CryptoCompareService;
use Illuminate\Support\Facades\Http;

class IndicatorRepository extends BaseRepository
{
    private CoinGeckoService $coinGeckoService;
    private ?CryptoCompareService $cryptoCompareService;

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
     * Get Rainbow Chart data
     *
     * @param string $coinId
     * @return array
     */
    public function getRainbowChartData(string $coinId = 'bitcoin'): array
    {
        $this->logOperation('getRainbowChartData', ['coinId' => $coinId]);
        
        // Placeholder for Phase 2 implementation
        return [
            'prices' => [],
            'bands' => [],
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
}