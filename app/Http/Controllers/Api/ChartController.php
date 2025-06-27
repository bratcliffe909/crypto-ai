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
        $cacheKey = "bull_market_band_bitcoin";
        
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
     * Convert market chart data to OHLC format
     */
    private function convertMarketChartToOHLC($marketData)
    {
        $ohlcData = [];
        $prices = $marketData['prices'] ?? [];
        
        // Group prices by day and create OHLC data
        $dailyPrices = [];
        foreach ($prices as $price) {
            $timestamp = $price[0] / 1000; // Convert from milliseconds
            $date = date('Y-m-d', $timestamp);
            $value = $price[1];
            
            if (!isset($dailyPrices[$date])) {
                $dailyPrices[$date] = [
                    'timestamp' => $timestamp,
                    'prices' => []
                ];
            }
            $dailyPrices[$date]['prices'][] = $value;
        }
        
        // Convert to OHLC format
        foreach ($dailyPrices as $date => $data) {
            $prices = $data['prices'];
            if (empty($prices)) continue;
            
            // For daily data, we'll use the first price as open, last as close,
            // and min/max for low/high
            $ohlcData[] = [
                $data['timestamp'] * 1000, // timestamp in milliseconds
                $prices[0],                // open
                max($prices),              // high
                min($prices),              // low
                end($prices)               // close
            ];
        }
        
        // Sort by timestamp
        usort($ohlcData, function($a, $b) {
            return $a[0] - $b[0];
        });
        
        return $ohlcData;
    }
}
