<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class CycleLowMultipleService
{
    private $coinGeckoService;
    
    // Bitcoin halving dates and cycle lows
    private const HALVING_DATES = [
        1 => '2012-11-28', // First halving - 50 to 25 BTC
        2 => '2016-07-09', // Second halving - 25 to 12.5 BTC
        3 => '2020-05-11', // Third halving - 12.5 to 6.25 BTC
        4 => '2024-04-20', // Fourth halving - 6.25 to 3.125 BTC
    ];
    
    // Known cycle lows for each era (found through historical data)
    // These are the absolute lowest prices in each 4-year cycle
    private const CYCLE_LOWS = [
        0 => 0.01,      // Genesis era low (pre-first halving) - approximate
        1 => 162.00,    // Era 1 low (between halving 1 and 2) - Jan 2015
        2 => 3122.00,   // Era 2 low (between halving 2 and 3) - Dec 2018
        3 => 15476.00,  // Era 3 low (between halving 3 and 4) - Nov 2022
    ];
    
    public function __construct(CoinGeckoService $coinGeckoService)
    {
        $this->coinGeckoService = $coinGeckoService;
    }
    
    /**
     * Get Cycle Low Multiple data
     */
    public function getCycleLowMultipleData($days = 'max')
    {
        $cacheKey = "cycle_low_multiple_data_{$days}";
        $cacheDuration = 3600; // 1 hour
        
        return Cache::remember($cacheKey, $cacheDuration, function () use ($days) {
            try {
                $priceData = $this->fetchHistoricalPriceData($days);
                
                if (empty($priceData)) {
                    throw new \Exception('No price data available');
                }
                
                $processedData = [];
                
                foreach ($priceData as $dataPoint) {
                    $date = Carbon::parse($dataPoint['date']);
                    $price = $dataPoint['price'];
                    
                    // Determine which era this date belongs to
                    $era = $this->determineEra($date);
                    
                    // Get the previous era's cycle low
                    $previousEraLow = $this->getPreviousEraLow($era);
                    
                    // Calculate the multiple
                    $multiple = $previousEraLow > 0 ? $price / $previousEraLow : 0;
                    
                    // Calculate days since the current era's halving
                    $daysSinceHalving = $this->getDaysSinceHalving($date, $era);
                    
                    $processedData[] = [
                        'date' => $dataPoint['date'],
                        'timestamp' => $dataPoint['timestamp'],
                        'price' => round($price, 2),
                        'multiple' => round($multiple, 2),
                        'era' => $era,
                        'daysSinceHalving' => $daysSinceHalving,
                        'previousEraLow' => $previousEraLow,
                    ];
                }
                
                // Add metadata
                $metadata = [
                    'lastUpdate' => now()->toIso8601String(),
                    'dataPoints' => count($processedData),
                    'currentEra' => $this->determineEra(now()),
                    'halvingDates' => self::HALVING_DATES,
                    'cycleLows' => self::CYCLE_LOWS,
                ];
                
                return [
                    'data' => $processedData,
                    'metadata' => $metadata,
                ];
                
            } catch (\Exception $e) {
                Log::error('Cycle Low Multiple data fetch error: ' . $e->getMessage());
                throw $e;
            }
        });
    }
    
    /**
     * Fetch historical price data from multiple sources
     */
    private function fetchHistoricalPriceData($days)
    {
        $priceData = [];
        
        // Always try CryptoCompare first
        try {
            $historicalData = $this->fetchCryptoCompareHistory();
            if (!empty($historicalData)) {
                $priceData = $historicalData;
                
                // If specific days requested (not 'max'), filter the data
                if ($days !== 'max') {
                    $daysToShow = intval($days);
                    $cutoffTime = time() - ($daysToShow * 24 * 60 * 60);
                    
                    $priceData = array_filter($priceData, function($item) use ($cutoffTime) {
                        return $item['timestamp'] >= $cutoffTime;
                    });
                    
                    $priceData = array_values($priceData); // Re-index array
                }
                
                Log::info("Cycle Low Multiple: Got " . count($priceData) . " days from CryptoCompare");
            }
        } catch (\Exception $e) {
            Log::warning("CryptoCompare failed for Cycle Low Multiple: " . $e->getMessage());
        }
        
        // Only try CoinGecko if CryptoCompare failed completely
        if (empty($priceData)) {
            try {
                $marketData = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', $days, 'daily');
                
                if (!empty($marketData['prices'])) {
                    $priceData = [];
                    foreach ($marketData['prices'] as $pricePoint) {
                        $priceData[] = [
                            'date' => date('Y-m-d', $pricePoint[0] / 1000),
                            'timestamp' => $pricePoint[0] / 1000,
                            'price' => $pricePoint[1]
                        ];
                    }
                    Log::info("Cycle Low Multiple: Got " . count($priceData) . " days from CoinGecko");
                }
            } catch (\Exception $e) {
                Log::warning('CoinGecko failed for Cycle Low Multiple: ' . $e->getMessage());
            }
        }
        
        // Sort by date ascending
        usort($priceData, function($a, $b) {
            return $a['timestamp'] - $b['timestamp'];
        });
        
        return $priceData;
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
            'aggregate' => 1
        ];
        
        try {
            $response = Http::timeout(30)->get($url, $params);
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Data']['Data']) && is_array($data['Data']['Data'])) {
                    $dailyPrices = [];
                    
                    foreach ($data['Data']['Data'] as $day) {
                        if (isset($day['time']) && isset($day['close']) && $day['close'] > 0) {
                            $dailyPrices[] = [
                                'date' => date('Y-m-d', $day['time']),
                                'timestamp' => $day['time'],
                                'price' => $day['close']
                            ];
                        }
                    }
                    
                    return $dailyPrices;
                }
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('CryptoCompare API error: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Determine which halving era a date belongs to
     */
    private function determineEra($date)
    {
        $dateCarbon = Carbon::parse($date);
        
        if ($dateCarbon->lt(Carbon::parse(self::HALVING_DATES[1]))) {
            return 0; // Pre-first halving
        } elseif ($dateCarbon->lt(Carbon::parse(self::HALVING_DATES[2]))) {
            return 1; // Between first and second halving
        } elseif ($dateCarbon->lt(Carbon::parse(self::HALVING_DATES[3]))) {
            return 2; // Between second and third halving
        } elseif ($dateCarbon->lt(Carbon::parse(self::HALVING_DATES[4]))) {
            return 3; // Between third and fourth halving
        } else {
            return 4; // After fourth halving
        }
    }
    
    /**
     * Get the previous era's cycle low
     */
    private function getPreviousEraLow($currentEra)
    {
        $previousEra = $currentEra - 1;
        
        if ($previousEra < 0) {
            return 0; // No previous era
        }
        
        return self::CYCLE_LOWS[$previousEra] ?? 0;
    }
    
    /**
     * Calculate days since the current era's halving
     */
    private function getDaysSinceHalving($date, $era)
    {
        if ($era === 0) {
            // For pre-first halving era, count from Bitcoin genesis
            $genesisDate = Carbon::parse('2009-01-03');
            return Carbon::parse($date)->diffInDays($genesisDate);
        }
        
        if (isset(self::HALVING_DATES[$era])) {
            $halvingDate = Carbon::parse(self::HALVING_DATES[$era]);
            // Use signed difference to show negative days before halving
            return Carbon::parse($halvingDate)->diffInDays(Carbon::parse($date), false);
        }
        
        return 0;
    }
    
    /**
     * Get current Cycle Low Multiple status
     */
    public function getCurrentStatus()
    {
        try {
            // Get current Bitcoin price
            $currentPrice = $this->coinGeckoService->getSimplePrice(['bitcoin'])['bitcoin']['usd'] ?? 0;
            
            if ($currentPrice <= 0) {
                throw new \Exception('Invalid current price');
            }
            
            $currentDate = now();
            $era = $this->determineEra($currentDate);
            $previousEraLow = $this->getPreviousEraLow($era);
            $multiple = $previousEraLow > 0 ? $currentPrice / $previousEraLow : 0;
            $daysSinceHalving = $this->getDaysSinceHalving($currentDate, $era);
            
            return [
                'price' => round($currentPrice, 2),
                'multiple' => round($multiple, 2),
                'era' => $era,
                'previousEraLow' => $previousEraLow,
                'daysSinceHalving' => $daysSinceHalving,
                'lastUpdate' => now()->toIso8601String(),
            ];
            
        } catch (\Exception $e) {
            Log::error('Cycle Low Multiple status error: ' . $e->getMessage());
            throw $e;
        }
    }
}