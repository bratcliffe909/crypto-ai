<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CoinGeckoService;
use App\Services\AlphaVantageService;
use App\Services\RainbowChartService;
use App\Services\CacheService;
use App\Repositories\IndicatorRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ChartController extends Controller
{
    private CoinGeckoService $coinGeckoService;
    private AlphaVantageService $alphaVantageService;
    private RainbowChartService $rainbowChartService;
    private CacheService $cacheService;
    private IndicatorRepository $indicatorRepository;
    
    public function __construct(
        CoinGeckoService $coinGeckoService, 
        AlphaVantageService $alphaVantageService,
        RainbowChartService $rainbowChartService,
        CacheService $cacheService,
        IndicatorRepository $indicatorRepository
    )
    {
        $this->coinGeckoService = $coinGeckoService;
        $this->alphaVantageService = $alphaVantageService;
        $this->rainbowChartService = $rainbowChartService;
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
    
}