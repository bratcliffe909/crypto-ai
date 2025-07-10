<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CoinGeckoService;
use App\Services\AlphaVantageService;
use App\Services\RainbowChartService;
use App\Services\CacheService;
use App\Services\CycleLowMultipleService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ChartController extends Controller
{
    private CoinGeckoService $coinGeckoService;
    private AlphaVantageService $alphaVantageService;
    private RainbowChartService $rainbowChartService;
    private CacheService $cacheService;
    private CycleLowMultipleService $cycleLowMultipleService;
    
    public function __construct(
        CoinGeckoService $coinGeckoService, 
        AlphaVantageService $alphaVantageService,
        RainbowChartService $rainbowChartService,
        CacheService $cacheService,
        CycleLowMultipleService $cycleLowMultipleService
    )
    {
        $this->coinGeckoService = $coinGeckoService;
        $this->alphaVantageService = $alphaVantageService;
        $this->rainbowChartService = $rainbowChartService;
        $this->cacheService = $cacheService;
        $this->cycleLowMultipleService = $cycleLowMultipleService;
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
                                    'open' => floatval($values['1b. open (USD)']),
                                    'high' => floatval($values['2b. high (USD)']),
                                    'low' => floatval($values['3b. low (USD)']),
                                    'close' => floatval($values['4b. close (USD)'])
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
                ->header('X-Last-Updated', $recentWeeksData['metadata']['lastUpdated'] ?? now()->toIso8601String());
                
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
        // Cache for 6 hours for historical data
        $cacheKey = "pi_cycle_top_bitcoin_v2";
        
        $data = $this->cacheService->rememberWithoutFreshness($cacheKey, function () {
            try {
                // Try to get historical data from multiple sources
                $dailyPrices = [];
                
                // First, try to get historical data from CryptoCompare (free, up to 2000 days)
                try {
                    $historicalData = $this->fetchCryptoCompareHistory();
                    if (!empty($historicalData)) {
                        $dailyPrices = $historicalData;
                        \Log::info("Got " . count($dailyPrices) . " days from CryptoCompare");
                    }
                } catch (\Exception $e) {
                    \Log::warning("CryptoCompare failed: " . $e->getMessage());
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
                    }
                    
                    // Check for crossover
                    if ($index > 349 && isset($result[$index - 1])) {
                        $prev = $result[$index - 1];
                        if ($prev['ma111'] !== null && $prev['ma350x2'] !== null &&
                            $dataPoint['ma111'] !== null && $dataPoint['ma350x2'] !== null) {
                            
                            // Check if 111 DMA crossed above 350 DMA x 2
                            if ($prev['ma111'] <= $prev['ma350x2'] && 
                                $dataPoint['ma111'] > $dataPoint['ma350x2']) {
                                $dataPoint['isCrossover'] = true;
                                \Log::info("Pi Cycle Top crossover detected on " . $dataPoint['date'] . " at price $" . $dataPoint['price']);
                            }
                        }
                    }
                    
                    $result[] = $dataPoint;
                }
                
                // Since we only have 365 days of data, return all of it
                // Filter out early data points without indicators
                $filteredResult = array_filter($result, function($item) {
                    return $item['ma111'] !== null || $item['ma350x2'] !== null || $item['price'] !== null;
                });
                
                \Log::info("Returning " . count($filteredResult) . " data points for Pi Cycle Top");
                
                return array_values($filteredResult);
                
            } catch (\Exception $e) {
                \Log::error('Pi Cycle Top error: ' . $e->getMessage());
                return [];
            }
        });
        
        // Extract data from cache service wrapper
        $piCycleData = $data['data'] ?? [];
        
        return response()->json($piCycleData)
            ->header('X-Cache-Age', $data['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $data['metadata']['source'] ?? 'cache')
            ->header('X-Last-Updated', $data['metadata']['lastUpdated'] ?? now()->toIso8601String());
    }
    
    /**
     * Fetch historical Bitcoin data from CryptoCompare
     */
    private function fetchCryptoCompareHistory()
    {
        $url = 'https://min-api.cryptocompare.com/data/v2/histoday';
        $params = [
            'fsym' => 'BTC',
            'tsym' => 'USD',
            'limit' => 2000, // Maximum allowed by free tier
            'aggregate' => 1,
            'api_key' => config('services.cryptocompare.key')
        ];
        
        try {
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
            \Log::error('CryptoCompare API error: ' . $e->getMessage());
            return [];
        }
    }
    
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
     * Get Bitcoin Cycle Low Multiple data
     */
    public function cycleLowMultiple(Request $request)
    {
        try {
            $days = $request->get('days', 'max');
            
            // Validate days parameter
            $validDays = ['365', '730', '1826', 'max'];
            if (!in_array($days, $validDays)) {
                $days = 'max';
            }
            
            $data = $this->cycleLowMultipleService->getCycleLowMultipleData($days);
            
            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error('Cycle Low Multiple error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch Cycle Low Multiple data',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again later'
            ], 500);
        }
    }
}