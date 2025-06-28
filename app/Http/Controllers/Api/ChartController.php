<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CoinGeckoService;
use App\Services\AlphaVantageService;
use Illuminate\Support\Facades\Cache;

class ChartController extends Controller
{
    private CoinGeckoService $coinGeckoService;
    private AlphaVantageService $alphaVantageService;
    
    public function __construct(CoinGeckoService $coinGeckoService, AlphaVantageService $alphaVantageService)
    {
        $this->coinGeckoService = $coinGeckoService;
        $this->alphaVantageService = $alphaVantageService;
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
        $cacheKey = "bull_market_band_bitcoin_v2";
        
        // Try to get cached data first
        $cachedData = Cache::get($cacheKey);
        
        // If we have cached data and it's less than 24 hours old, use it even if API fails
        if ($cachedData !== null) {
            return response()->json($cachedData);
        }
        
        // Cache for 5 minutes
        $data = Cache::remember($cacheKey, 300, function () {
            try {
                // Try Alpha Vantage first for historical weekly data
                $weeklyData = [];
                
                try {
                    $alphaVantageData = $this->alphaVantageService->getDigitalCurrencyWeekly('BTC', 'USD');
                    
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
                    $ohlcData = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 365);
                    
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
                    
                    // Add the last week (including current incomplete week)
                    if (!empty($weekData)) {
                        // For the current incomplete week, get the latest price
                        $isCurrentWeek = (time() - strtotime($currentWeekStart)) < 604800; // 7 days
                        
                        $weeklyCandle = [
                            'date' => $currentWeekStart,
                            'timestamp' => strtotime($currentWeekStart),
                            'open' => $weekData[0]['open'],
                            'high' => max(array_column($weekData, 'high')),
                            'low' => min(array_column($weekData, 'low')),
                            'close' => end($weekData)['close']
                        ];
                        
                        // If this is the current week, fetch the latest price
                        if ($isCurrentWeek) {
                            try {
                                $currentPrice = $this->coinGeckoService->getSimplePrice('bitcoin', 'usd');
                                if (isset($currentPrice['bitcoin']['usd'])) {
                                    $latestPrice = $currentPrice['bitcoin']['usd'];
                                    // Update high/low if necessary
                                    $weeklyCandle['close'] = $latestPrice;
                                    $weeklyCandle['high'] = max($weeklyCandle['high'], $latestPrice);
                                    $weeklyCandle['low'] = min($weeklyCandle['low'], $latestPrice);
                                    
                                    \Log::info("Updated current week with latest price: $latestPrice");
                                }
                            } catch (\Exception $e) {
                                \Log::warning("Failed to get current price for weekly candle: " . $e->getMessage());
                            }
                        }
                        
                        $weeklyData[] = $weeklyCandle;
                    }
                    
                    // Sort by date ascending
                    usort($weeklyData, function($a, $b) {
                        return $a['timestamp'] - $b['timestamp'];
                    });
                }
                
                // Calculate SMA and EMA
                $result = [];
                $emaValues = [];
                
                foreach ($weeklyData as $index => $week) {
                    $dataPoint = [
                        'date' => $week['date'],
                        'open' => round($week['open'], 2),
                        'high' => round($week['high'], 2),
                        'low' => round($week['low'], 2),
                        'close' => round($week['close'], 2),
                        'sma20' => null,
                        'ema21' => null
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
                            // EMA calculation: EMA = (Close - Previous EMA) × Multiplier + Previous EMA
                            $multiplier = 2.0 / (21.0 + 1.0);
                            $previousEma = $emaValues[$index - 1];
                            $emaValues[$index] = ($week['close'] - $previousEma) * $multiplier + $previousEma;
                        }
                        $dataPoint['ema21'] = round($emaValues[$index], 2);
                    }
                    
                    $result[] = $dataPoint;
                }
                
                // Return all available data for proper scrolling/panning
                // Frontend will handle initial view of 1 year
                return $result;
                
            } catch (\Exception $e) {
                \Log::error('Bull Market Band error: ' . $e->getMessage());
                return [];
            }
        });
        
        return response()->json($data);
    }
    
    /**
     * Get Pi Cycle Top Indicator data
     */
    public function piCycleTop(Request $request)
    {
        // Cache for 1 hour
        $cacheKey = "pi_cycle_top_bitcoin";
        
        $data = Cache::remember($cacheKey, 3600, function () {
            try {
                // Try to get market chart data first
                $dailyPrices = [];
                
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
                        \Log::info("Got " . count($dailyPrices) . " days of price data from market chart");
                    }
                } catch (\Exception $e) {
                    \Log::warning("Market chart failed, trying OHLC: " . $e->getMessage());
                }
                
                // If market chart fails or has no data, try OHLC
                if (empty($dailyPrices)) {
                    $ohlcData = $this->coinGeckoService->getOHLC('bitcoin', 'usd', 365);
                    
                    if (!empty($ohlcData)) {
                        foreach ($ohlcData as $candle) {
                            $timestamp = $candle[0] / 1000;
                            $dailyPrices[] = [
                                'date' => date('Y-m-d', $timestamp),
                                'timestamp' => $timestamp,
                                'price' => $candle[4] // close price
                            ];
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
                                \Log::info("Pi Cycle Top crossover detected on " . $dataPoint['date']);
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
        
        return response()->json($data);
    }
}