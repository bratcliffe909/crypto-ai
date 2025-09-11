<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CoinGeckoService;
use App\Services\AlphaVantageService;
use App\Services\RainbowChartService;
use App\Services\FREDService;
use App\Services\CacheService;
use App\Repositories\IndicatorRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ChartController extends Controller
{
    private CoinGeckoService $coinGeckoService;
    private AlphaVantageService $alphaVantageService;
    private RainbowChartService $rainbowChartService;
    private FREDService $fredService;
    private CacheService $cacheService;
    private IndicatorRepository $indicatorRepository;
    
    public function __construct(
        CoinGeckoService $coinGeckoService, 
        AlphaVantageService $alphaVantageService,
        RainbowChartService $rainbowChartService,
        FREDService $fredService,
        CacheService $cacheService,
        IndicatorRepository $indicatorRepository
    )
    {
        $this->coinGeckoService = $coinGeckoService;
        $this->alphaVantageService = $alphaVantageService;
        $this->rainbowChartService = $rainbowChartService;
        $this->fredService = $fredService;
        $this->cacheService = $cacheService;
        $this->indicatorRepository = $indicatorRepository;
    }
    
    /**
     * Get OHLC data for a specific coin
     */
    public function ohlc(Request $request, $id)
    {
        $vsCurrency = $request->get('vs_currency', 'usd');
        $days = $request->get('days', 365);
        
        try {
            $data = $this->coinGeckoService->getOHLC($id, $vsCurrency, $days);
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Get Bull Market Band data (20-week SMA and 21-week EMA)
     */
    public function bullMarketBand(Request $request)
    {
        try {
            // Get historical weekly data (cached FOREVER since historical prices never change)
            $historicalKey = "bull_market_band_historical_v3";
            $historicalResult = $this->cacheService->rememberHistoricalForever($historicalKey, function($fromDate, $toDate) {
                // Try Alpha Vantage first for historical weekly data
                $weeklyData = [];
                
                try {
                    $alphaVantageResult = $this->alphaVantageService->getDigitalCurrencyWeekly('BTC', 'USD');
                    
                    // Extract data from cache service wrapper
                    $alphaVantageData = $alphaVantageResult['data'] ?? [];
                    
                    if (!empty($alphaVantageData)) {
                        if (isset($alphaVantageData['Time Series (Digital Currency Weekly)'])) {
                            $timeSeries = $alphaVantageData['Time Series (Digital Currency Weekly)'];
                            
                            foreach ($timeSeries as $date => $values) {
                                $weeklyData[] = [
                                    'date' => $date,
                                    'timestamp' => strtotime($date),
                                    'open' => floatval($values['1. open']),
                                    'high' => floatval($values['2. high']),
                                    'low' => floatval($values['3. low']),
                                    'close' => floatval($values['4. close'])
                                ];
                            }
                            
                            // Sort by date ascending
                            usort($weeklyData, function($a, $b) {
                                return $a['timestamp'] - $b['timestamp'];
                            });
                            
                            \Log::info("Alpha Vantage provided " . count($weeklyData) . " weeks of data");
                        } else {
                            \Log::warning("Alpha Vantage response keys: " . implode(', ', array_keys($alphaVantageData)));
                        }
                    } else {
                        \Log::warning("Alpha Vantage returned empty data");
                    }
                } catch (\Exception $e) {
                    \Log::warning("Alpha Vantage failed: " . $e->getMessage());
                }
                
                // If Alpha Vantage fails or provides insufficient data, fall back to CoinGecko
                if (empty($weeklyData) || count($weeklyData) < 52) {
                    \Log::info("Falling back to CoinGecko for data");
                    
                    // Try to get daily data and convert to weekly
                    $ohlcResult = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 365);
                    $ohlcData = $ohlcResult['data'] ?? [];
                    
                    if (!is_array($ohlcData) || empty($ohlcData)) {
                        return [];
                    }
                    
                    // Convert OHLC data to weekly data (Monday to Sunday)
                    $weeklyData = [];
                    $currentWeekStart = null;
                    $weekData = [];
                    
                    foreach ($ohlcData as $candle) {
                        $timestamp = $candle[0] / 1000; // Convert from milliseconds
                        $date = date('Y-m-d', $timestamp);
                        
                        // Get Monday of this week
                        $dayOfWeek = date('w', $timestamp);
                        $daysFromMonday = ($dayOfWeek == 0) ? 6 : $dayOfWeek - 1;
                        $mondayTimestamp = $timestamp - ($daysFromMonday * 86400);
                        $mondayDate = date('Y-m-d', $mondayTimestamp);
                        
                        if ($currentWeekStart !== $mondayDate) {
                            if ($currentWeekStart !== null && !empty($weekData)) {
                                // Calculate weekly candle from daily data
                                $weeklyData[] = [
                                    'date' => $currentWeekStart,
                                    'timestamp' => strtotime($currentWeekStart),
                                    'open' => $weekData[0]['open'],
                                    'high' => max(array_column($weekData, 'high')),
                                    'low' => min(array_column($weekData, 'low')),
                                    'close' => end($weekData)['close']
                                ];
                            }
                            $currentWeekStart = $mondayDate;
                            $weekData = [];
                        }
                        
                        $weekData[] = [
                            'timestamp' => $timestamp,
                            'open' => $candle[1],
                            'high' => $candle[2],
                            'low' => $candle[3],
                            'close' => $candle[4]
                        ];
                    }
                    
                    // Add the last week
                    if (!empty($weekData)) {
                        $weeklyData[] = [
                            'date' => $currentWeekStart,
                            'timestamp' => strtotime($currentWeekStart),
                            'open' => $weekData[0]['open'],
                            'high' => max(array_column($weekData, 'high')),
                            'low' => min(array_column($weekData, 'low')),
                            'close' => end($weekData)['close']
                        ];
                    }
                    
                    // Sort by date ascending
                    usort($weeklyData, function($a, $b) {
                        return $a['timestamp'] - $b['timestamp'];
                    });
                }
                
                return $weeklyData;
            }, 'date');
            
            $weeklyData = $historicalResult['data'] ?? [];
            
            // Get recent weeks data (cached for 1 minute) - includes current and last week
            $recentWeeksKey = "bull_market_band_recent_weeks";
            $recentWeeksData = $this->cacheService->remember($recentWeeksKey, 60, function() {
                // Get current week's start date
                $now = now();
                $dayOfWeek = $now->dayOfWeek;
                $daysFromMonday = ($dayOfWeek == 0) ? 6 : $dayOfWeek - 1;
                $currentMondayDate = $now->copy()->subDays($daysFromMonday)->format('Y-m-d');
                $lastMondayDate = $now->copy()->subDays($daysFromMonday + 7)->format('Y-m-d');
                
                // Get latest price
                $priceResult = $this->coinGeckoService->getSimplePrice('bitcoin', 'usd');
                $currentPrice = $priceResult['data']['bitcoin']['usd'] ?? null;
                
                if (!$currentPrice) {
                    return [];
                }
                
                // Get OHLC data for last 14 days to cover both weeks
                $ohlcResult = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 14);
                $ohlcData = $ohlcResult['data'] ?? [];
                
                $weeks = [
                    $lastMondayDate => [
                        'date' => $lastMondayDate,
                        'open' => null,
                        'high' => 0,
                        'low' => PHP_FLOAT_MAX,
                        'close' => null,
                        'isLastWeek' => true
                    ],
                    $currentMondayDate => [
                        'date' => $currentMondayDate,
                        'open' => null,
                        'high' => $currentPrice,
                        'low' => $currentPrice,
                        'close' => $currentPrice,
                        'isCurrentWeek' => true
                    ]
                ];
                
                // Process OHLC data for both weeks
                foreach ($ohlcData as $candle) {
                    $timestamp = $candle[0] / 1000;
                    $date = date('Y-m-d', $timestamp);
                    
                    // Determine which week this candle belongs to
                    $weekStart = null;
                    if ($date >= $currentMondayDate) {
                        $weekStart = $currentMondayDate;
                    } elseif ($date >= $lastMondayDate) {
                        $weekStart = $lastMondayDate;
                    }
                    
                    if ($weekStart && isset($weeks[$weekStart])) {
                        if ($weeks[$weekStart]['open'] === null) {
                            $weeks[$weekStart]['open'] = $candle[1]; // First candle's open
                        }
                        $weeks[$weekStart]['high'] = max($weeks[$weekStart]['high'], $candle[2]);
                        $weeks[$weekStart]['low'] = min($weeks[$weekStart]['low'], $candle[3]);
                        $weeks[$weekStart]['close'] = $candle[4]; // Last candle's close
                    }
                }
                
                // Update current week's close with latest price
                $weeks[$currentMondayDate]['close'] = $currentPrice;
                $weeks[$currentMondayDate]['high'] = max($weeks[$currentMondayDate]['high'], $currentPrice);
                $weeks[$currentMondayDate]['low'] = min($weeks[$currentMondayDate]['low'], $currentPrice);
                
                // Round values and handle defaults
                $validWeeks = [];
                foreach ($weeks as $week) {
                    // Skip weeks with no valid data
                    if ($week['close'] === null || $week['close'] == 0) {
                        continue;
                    }
                    
                    $week['open'] = round($week['open'] ?? $week['close'], 2);
                    $week['high'] = round($week['high'] == 0 ? $week['close'] : $week['high'], 2);
                    $week['low'] = round($week['low'] == PHP_FLOAT_MAX ? $week['close'] : $week['low'], 2);
                    $week['close'] = round($week['close'], 2);
                    
                    $validWeeks[] = $week;
                }
                
                return $validWeeks;
            });
            
            // Merge historical and recent weeks data
            $recentWeeks = $recentWeeksData['data'] ?? [];
            
            if (!empty($recentWeeks)) {
                if (!empty($weeklyData)) {
                    // Remove the last 2 weeks from historical data as we'll replace them with updated data
                    $cutoffDate = $recentWeeks[0]['date'] ?? null; // First recent week (last week)
                    
                    if ($cutoffDate) {
                        // Filter out any weeks >= cutoff date
                        $weeklyData = array_filter($weeklyData, function($week) use ($cutoffDate) {
                            return $week['date'] < $cutoffDate;
                        });
                        
                        // Re-index array
                        $weeklyData = array_values($weeklyData);
                    }
                }
                
                // Add the recent weeks (whether we have historical data or not)
                foreach ($recentWeeks as $recentWeek) {
                    $weeklyData[] = $recentWeek;
                }
            }
            
            // Calculate SMA and EMA
            $result = [];
            $emaValues = [];
            
            foreach ($weeklyData as $index => $week) {
                $dataPoint = [
                    'date' => $week['date'],
                    'open' => $week['open'],
                    'high' => $week['high'],
                    'low' => $week['low'],
                    'close' => $week['close'],
                    'sma20' => null,
                    'ema21' => null,
                    'isCurrentWeek' => $week['isCurrentWeek'] ?? false
                ];
                
                // Calculate 20-week SMA
                if ($index >= 19) {
                    $sum = 0;
                    for ($i = $index - 19; $i <= $index; $i++) {
                        $sum += $weeklyData[$i]['close'];
                    }
                    $dataPoint['sma20'] = round($sum / 20, 2);
                }
                
                // Calculate 21-week EMA
                if ($index >= 20) {
                    if ($index == 20) {
                        // First EMA is the SMA of first 21 values
                        $sum = 0;
                        for ($i = 0; $i <= 20; $i++) {
                            $sum += $weeklyData[$i]['close'];
                        }
                        $emaValues[$index] = $sum / 21;
                    } else {
                        // EMA calculation
                        $multiplier = 2.0 / (21.0 + 1.0);
                        $previousEma = $emaValues[$index - 1];
                        $emaValues[$index] = ($week['close'] - $previousEma) * $multiplier + $previousEma;
                    }
                    $dataPoint['ema21'] = round($emaValues[$index], 2);
                }
                
                $result[] = $dataPoint;
            }
            
            return response()->json($result)
                ->header('X-Cache-Age', $recentWeeksData['metadata']['cacheAge'] ?? 0)
                ->header('X-Data-Source', $recentWeeksData['metadata']['source'] ?? 'cache')
                ->header('X-Last-Updated', $recentWeeksData['metadata']['lastUpdated'] ?? '');
                
        } catch (\Exception $e) {
            \Log::error('Bull Market Band error: ' . $e->getMessage());
            return response()->json([], 200);
        }
    }
    
    /**
     * Get Pi Cycle Top Indicator data
     */
    public function piCycleTop(Request $request)
    {
        try {
            // Use repository to get Pi Cycle Top data
            $result = $this->indicatorRepository->getPiCycleTopData();
            
            // Extract data and metadata (checking for CacheService format)
            $piCycleData = isset($result['data']['data']) ? $result['data']['data'] : ($result['data'] ?? []);
            $innerMetadata = isset($result['data']['metadata']) ? $result['data']['metadata'] : ($result['metadata'] ?? []);
            $cacheMetadata = $result['metadata'] ?? [];
            
            // Filter out early data points without indicators for cleaner display
            $filteredData = array_filter($piCycleData, function($item) {
                return $item['ma111'] !== null || $item['ma350x2'] !== null || $item['price'] !== null;
            });
            
            return response()->json(array_values($filteredData))
                ->header('X-Last-Crossover', $innerMetadata['last_crossover'] ?? 'none')
                ->header('X-Current-Status', $innerMetadata['current_status'] ?? 'unknown')
                ->header('X-Data-Source', $cacheMetadata['source'] ?? 'repository')
                ->header('X-Last-Updated', $cacheMetadata['lastUpdated'] ?? '');
                
        } catch (\Exception $e) {
            \Log::error('Pi Cycle Top controller error: ' . $e->getMessage());
            return response()->json([], 500);
        }
    }
    
    // fetchCryptoCompareHistory method moved to IndicatorRepository
    
    /**
     * Get Bitcoin Rainbow Chart data
     */
    public function rainbowChart(Request $request)
    {
        try {
            $days = $request->get('days', 'max');
            
            // Validate days parameter
            $validDays = ['365', '730', '1826', 'max'];
            if (!in_array($days, $validDays)) {
                $days = 'max';
            }
            
            $data = $this->rainbowChartService->getRainbowChartData($days);
            
            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error('Rainbow chart error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch rainbow chart data',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again later'
            ], 500);
        }
    }
    
    /**
     * Get current Rainbow Chart status
     */
    public function rainbowChartStatus()
    {
        try {
            $status = $this->rainbowChartService->getCurrentStatus();
            
            return response()->json($status);
        } catch (\Exception $e) {
            \Log::error('Rainbow chart status error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch rainbow chart status',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again later'
            ], 500);
        }
    }

    /**
     * Get available economic indicators
     */
    public function economicIndicators()
    {
        try {
            $indicators = $this->cacheService->remember('economic_indicators', 3600, function() {
                return [
                    'federal_funds_rate' => [
                        'name' => 'Federal Funds Rate',
                        'unit' => '%',
                        'description' => 'The interest rate at which depository institutions lend balances to other institutions overnight'
                    ],
                    'inflation_cpi' => [
                        'name' => 'Consumer Price Index',
                        'unit' => '%',
                        'description' => 'A measure of the average change in prices of goods and services consumed by households'
                    ],
                    'unemployment_rate' => [
                        'name' => 'Unemployment Rate',
                        'unit' => '%',
                        'description' => 'The percentage of the labor force that is unemployed and actively seeking employment'
                    ],
                    'dxy_dollar_index' => [
                        'name' => 'US Dollar Index (DXY)',
                        'unit' => '',
                        'description' => 'A measure of the value of the US dollar relative to a basket of foreign currencies'
                    ]
                ];
            });

            $result = $indicators['data'] ?? [];
            $metadata = $indicators['metadata'] ?? [];

            return response()->json([
                'indicators' => $result,
                'count' => count($result),
                'available' => array_keys($result)
            ])->header('X-Data-Source', $metadata['source'] ?? 'cache')
              ->header('X-Last-Updated', $metadata['lastUpdated'] ?? '');

        } catch (\Exception $e) {
            \Log::error('Economic indicators error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch economic indicators',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again later'
            ], 500);
        }
    }

    /**
     * Get economic overlay data for correlation analysis
     */
    public function economicOverlay(Request $request)
    {
        try {
            $indicator = $request->get('indicator', 'federal_funds_rate');
            $days = (int) $request->get('days', 365);

            // Validate indicator
            $validIndicators = ['federal_funds_rate', 'inflation_cpi', 'unemployment_rate', 'dxy_dollar_index'];
            if (!in_array($indicator, $validIndicators)) {
                return response()->json([
                    'error' => 'Invalid indicator',
                    'message' => 'Valid indicators: ' . implode(', ', $validIndicators)
                ], 400);
            }

            $cacheKey = "economic_overlay_{$indicator}_{$days}";
            
            $result = $this->cacheService->remember($cacheKey, 3600, function() use ($indicator, $days) {
                // Get Bitcoin price data - use different sources based on time range
                if ($days > 365) {
                    // For longer periods, try AlphaVantage weekly data first
                    try {
                        $alphaVantageResult = $this->alphaVantageService->getDigitalCurrencyWeekly('BTC', 'USD');
                        $alphaVantageData = $alphaVantageResult['data'] ?? [];
                        
                        if (!empty($alphaVantageData) && isset($alphaVantageData['Time Series (Digital Currency Weekly)'])) {
                            $timeSeries = $alphaVantageData['Time Series (Digital Currency Weekly)'];
                            $bitcoinData = [];
                            
                            // Convert AlphaVantage format to OHLC format
                            foreach ($timeSeries as $date => $values) {
                                $timestamp = strtotime($date) * 1000; // Convert to milliseconds
                                $bitcoinData[] = [
                                    $timestamp,
                                    floatval($values['1. open']),
                                    floatval($values['2. high']),
                                    floatval($values['3. low']),
                                    floatval($values['4. close'])
                                ];
                            }
                            
                            // Sort by timestamp ascending
                            usort($bitcoinData, function($a, $b) {
                                return $a[0] - $b[0];
                            });
                            
                            // Filter to requested time range
                            $cutoffTimestamp = (time() - ($days * 24 * 60 * 60)) * 1000;
                            $bitcoinData = array_filter($bitcoinData, function($candle) use ($cutoffTimestamp) {
                                return $candle[0] >= $cutoffTimestamp;
                            });
                            $bitcoinData = array_values($bitcoinData);
                            
                            \Log::info("Using AlphaVantage weekly data for {$days} days: " . count($bitcoinData) . " data points");
                        } else {
                            // Fall back to CoinGecko for maximum available
                            $bitcoinResult = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 365);
                            $bitcoinData = $bitcoinResult['data'] ?? [];
                            \Log::info("Falling back to CoinGecko 365-day data: " . count($bitcoinData) . " data points");
                        }
                    } catch (\Exception $e) {
                        // Fall back to CoinGecko
                        $bitcoinResult = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 365);
                        $bitcoinData = $bitcoinResult['data'] ?? [];
                        \Log::warning("AlphaVantage failed, using CoinGecko: " . $e->getMessage());
                    }
                } else {
                    // For 365 days or less, use CoinGecko
                    $bitcoinResult = $this->coinGeckoService->getOHLC('bitcoin', 'usd', $days);
                    $bitcoinData = $bitcoinResult['data'] ?? [];
                }

                // Get economic data based on indicator
                $economicData = $this->getEconomicDataByIndicator($indicator, $days);

                if (empty($economicData)) {
                    return [
                        'data' => [],
                        'metadata' => [
                            'indicator' => $indicator,
                            'days' => $days,
                            'error' => 'No economic data available'
                        ]
                    ];
                }

                // If Bitcoin data is available, correlate with economic data
                if (!empty($bitcoinData)) {
                    $correlatedData = $this->correlateData($bitcoinData, $economicData, $indicator);
                } else {
                    // Just format economic data without Bitcoin correlation
                    $correlatedData = array_map(function($item) use ($indicator) {
                        return [
                            'date' => $item['date'],
                            $indicator => $item['value']
                        ];
                    }, $economicData);
                }
                
                // Validate correlated data for NaN/Inf values
                $correlatedData = array_map(function($item) {
                    foreach ($item as $key => $value) {
                        if (is_numeric($value) && (!is_finite($value) || is_nan($value))) {
                            $item[$key] = null; // Replace with null
                        }
                    }
                    return $item;
                }, $correlatedData);
                
                // Calculate correlation with error handling
                $correlation = null;
                try {
                    $correlation = $this->calculateCorrelation($correlatedData, $indicator);
                    
                    // Validate correlation result
                    if (!is_null($correlation) && (!is_finite($correlation) || is_nan($correlation))) {
                        $correlation = null;
                    }
                } catch (\Exception $e) {
                    \Log::error("Correlation calculation failed: " . $e->getMessage());
                    $correlation = null;
                }

                // Get current Bitcoin price for display consistency
                $currentPrice = null;
                try {
                    $priceResult = $this->coinGeckoService->getSimplePrice('bitcoin', 'usd');
                    $currentPrice = $priceResult['data']['bitcoin']['usd'] ?? null;
                } catch (\Exception $e) {
                    \Log::warning("Failed to fetch current Bitcoin price: " . $e->getMessage());
                }

                return [
                    'data' => $correlatedData,
                    'metadata' => [
                        'indicator' => $indicator,
                        'days' => $days,
                        'data_points' => count($correlatedData),
                        'correlation' => $correlation,
                        'current_bitcoin_price' => $currentPrice
                    ]
                ];
            });

            // Handle potential double-wrapping from cache service
            $rawData = $result['data'] ?? [];
            $data = isset($rawData['data']) ? $rawData['data'] : $rawData;
            $metadata = $result['metadata'] ?? [];
            $cacheMetadata = $result['metadata'] ?? [];

            // Always fetch current Bitcoin price (outside cache) for display consistency
            $currentPrice = null;
            try {
                $priceResult = $this->coinGeckoService->getSimplePrice('bitcoin', 'usd');
                $currentPrice = $priceResult['data']['bitcoin']['usd'] ?? null;
                
                // Add current price to metadata
                if (is_array($metadata)) {
                    $metadata['current_bitcoin_price'] = $currentPrice;
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to fetch current Bitcoin price for display: " . $e->getMessage());
            }

            // Validate all response data for JSON encoding issues
            $responseData = [
                'data' => $data,
                'metadata' => $metadata
            ];
            
            // Validate response for JSON encoding issues
            $jsonTest = json_encode($responseData);
            if ($jsonTest === false) {
                \Log::error("JSON encoding failed for economic overlay response: " . json_last_error_msg());
                return response()->json([
                    'error' => 'Data processing error',
                    'message' => 'Unable to process economic overlay data'
                ], 500);
            }

            return response()->json($responseData)
                ->header('X-Data-Source', $cacheMetadata['source'] ?? 'cache')
                ->header('X-Last-Updated', $cacheMetadata['lastUpdated'] ?? '');

        } catch (\Exception $e) {
            \Log::error('Economic overlay error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch economic overlay data',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again later'
            ], 500);
        }
    }

    /**
     * Get economic data by indicator type
     */
    private function getEconomicDataByIndicator($indicator, $days)
    {
        $startDate = now()->subDays($days)->format('Y-m-d');
        $endDate = now()->format('Y-m-d');

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
                return [];
        }
    }

    /**
     * Correlate Bitcoin price data with economic indicator data
     */
    private function correlateData($bitcoinData, $economicData, $indicator)
    {
        $correlatedData = [];
        $economicByDate = [];

        // Index economic data by date for faster lookup
        foreach ($economicData as $item) {
            $economicByDate[$item['date']] = $item['value'];
        }

        // Correlate Bitcoin prices with economic data
        foreach ($bitcoinData as $btcCandle) {
            $timestamp = $btcCandle[0] / 1000; // Convert from milliseconds
            $date = date('Y-m-d', $timestamp);
            $bitcoinPrice = $btcCandle[4]; // Close price

            // Find matching economic data (exact match or most recent)
            $economicValue = $this->findClosestEconomicValue($economicByDate, $date);

            if ($economicValue !== null) {
                $correlatedData[] = [
                    'date' => $date,
                    'bitcoin_price' => round($bitcoinPrice, 2),
                    $indicator => $economicValue
                ];
            }
        }

        return $correlatedData;
    }

    /**
     * Find the closest economic value for a given date
     */
    private function findClosestEconomicValue($economicByDate, $targetDate)
    {
        // First try exact match
        if (isset($economicByDate[$targetDate])) {
            return $economicByDate[$targetDate];
        }

        // Find the most recent value before the target date
        $targetTimestamp = strtotime($targetDate);
        $closestValue = null;
        $closestTimestamp = 0;

        foreach ($economicByDate as $date => $value) {
            $timestamp = strtotime($date);
            
            // Only consider dates before or equal to target date
            if ($timestamp <= $targetTimestamp && $timestamp > $closestTimestamp) {
                $closestTimestamp = $timestamp;
                $closestValue = $value;
            }
        }

        return $closestValue;
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    private function calculateCorrelation($data, $indicator)
    {
        if (count($data) < 2) {
            return null;
        }

        $bitcoinPrices = array_column($data, 'bitcoin_price');
        $economicValues = array_column($data, $indicator);

        // Remove null values
        $validData = [];
        for ($i = 0; $i < count($bitcoinPrices); $i++) {
            if ($bitcoinPrices[$i] !== null && $economicValues[$i] !== null) {
                $validData[] = [
                    'bitcoin' => $bitcoinPrices[$i],
                    'economic' => $economicValues[$i]
                ];
            }
        }

        if (count($validData) < 2) {
            return null;
        }

        $bitcoinValues = array_column($validData, 'bitcoin');
        $economicValues = array_column($validData, 'economic');

        // Check for variance in both datasets
        $bitcoinVariance = $this->calculateVariance($bitcoinValues);
        $economicVariance = $this->calculateVariance($economicValues);

        // If either dataset has no variance (constant values), correlation is undefined
        if ($bitcoinVariance == 0 || $economicVariance == 0) {
            return null;
        }

        $n = count($bitcoinValues);
        $sumBitcoin = array_sum($bitcoinValues);
        $sumEconomic = array_sum($economicValues);

        $sumBitcoinSq = array_sum(array_map(fn($x) => $x * $x, $bitcoinValues));
        $sumEconomicSq = array_sum(array_map(fn($x) => $x * $x, $economicValues));

        $sumProducts = 0;
        for ($i = 0; $i < $n; $i++) {
            $sumProducts += $bitcoinValues[$i] * $economicValues[$i];
        }

        $numerator = ($n * $sumProducts) - ($sumBitcoin * $sumEconomic);
        $denominator = sqrt(
            (($n * $sumBitcoinSq) - ($sumBitcoin * $sumBitcoin)) *
            (($n * $sumEconomicSq) - ($sumEconomic * $sumEconomic))
        );

        // Additional safety check for denominator
        if ($denominator == 0 || !is_finite($denominator)) {
            return null;
        }

        $correlation = $numerator / $denominator;
        
        // Handle potential floating point errors and edge cases
        if (!is_finite($correlation) || is_nan($correlation)) {
            return null;
        }

        // Clamp correlation to valid range [-1, 1] to handle floating point precision issues
        $correlation = max(-1, min(1, $correlation));

        return round($correlation, 4);
    }

    /**
     * Calculate variance of a dataset
     */
    private function calculateVariance($values)
    {
        $n = count($values);
        if ($n < 2) return 0;

        $mean = array_sum($values) / $n;
        $variance = 0;

        foreach ($values as $value) {
            $variance += pow($value - $mean, 2);
        }

        return $variance / ($n - 1);
    }
    
}