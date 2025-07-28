<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RainbowChartService;
use App\Services\CoinGeckoService;
use App\Services\AlphaVantageService;
use App\Services\CacheService;
use App\Repositories\AltcoinSeasonRepository;
use App\Repositories\IndicatorRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class UpdateIndicatorCache extends Command
{
    protected $signature = 'cache:update-indicators {--force : Force update even if cache is fresh}';
    protected $description = 'Update Redis cache for Pi Cycle Top, Rainbow Chart, Altcoin Season Index, and RSI';

    protected $rainbowChartService;
    protected $coinGeckoService;
    protected $alphaVantageService;
    protected $cacheService;
    protected $altcoinSeasonRepository;
    protected $indicatorRepository;

    public function __construct(
        RainbowChartService $rainbowChartService,
        CoinGeckoService $coinGeckoService,
        AlphaVantageService $alphaVantageService,
        CacheService $cacheService,
        AltcoinSeasonRepository $altcoinSeasonRepository,
        IndicatorRepository $indicatorRepository
    )
    {
        parent::__construct();
        $this->rainbowChartService = $rainbowChartService;
        $this->coinGeckoService = $coinGeckoService;
        $this->alphaVantageService = $alphaVantageService;
        $this->cacheService = $cacheService;
        $this->altcoinSeasonRepository = $altcoinSeasonRepository;
        $this->indicatorRepository = $indicatorRepository;
    }

    public function handle()
    {
        $this->info('Starting indicator cache update...');
        
        $startTime = microtime(true);
        $results = [
            'piCycle' => ['status' => 'pending', 'dataPoints' => 0, 'error' => null],
            'rainbow' => ['status' => 'pending', 'dataPoints' => 0, 'error' => null],
            'altcoinSeason' => ['status' => 'pending', 'index' => null, 'error' => null],
            'rsi' => ['status' => 'pending', 'value' => null, 'error' => null]
        ];
        
        // Update Pi Cycle Top Indicator
        try {
            $this->info('Updating Pi Cycle Top Indicator...');
            $piCycleData = $this->updatePiCycleTop();
            $results['piCycle']['dataPoints'] = $piCycleData['dataPoints'];
            $results['piCycle']['status'] = 'success';
            $this->info("✓ Pi Cycle Top updated: {$piCycleData['dataPoints']} data points");
        } catch (\Exception $e) {
            $results['piCycle']['status'] = 'failed';
            $results['piCycle']['error'] = $e->getMessage();
            $this->error('✗ Failed to update Pi Cycle Top: ' . $e->getMessage());
            Log::error('Pi Cycle Top cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update Rainbow Chart - populate master cache
        try {
            $this->info('Updating Bitcoin Rainbow Chart...');
            
            // Call getRainbowChartDataDirect to fetch fresh data and update cache
            $rainbowData = $this->rainbowChartService->getRainbowChartDataDirect('max');
            
            if (!empty($rainbowData['data'])) {
                $dataPoints = count($rainbowData['data']);
                $results['rainbow']['dataPoints'] = $dataPoints;
                $results['rainbow']['status'] = 'success';
                $this->info("✓ Rainbow Chart updated: " . $dataPoints . " data points in master cache");
            } else {
                $results['rainbow']['status'] = 'empty';
                $this->warn('⚠ Rainbow Chart returned empty data');
            }
        } catch (\Exception $e) {
            $results['rainbow']['status'] = 'failed';
            $results['rainbow']['error'] = $e->getMessage();
            $this->error('✗ Failed to update Rainbow Chart: ' . $e->getMessage());
            Log::error('Rainbow Chart cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update Altcoin Season Index
        try {
            $this->info('Updating Altcoin Season Index...');
            $altcoinData = $this->altcoinSeasonRepository->calculateAltcoinSeasonIndexDirect();
            
            if ($altcoinData && isset($altcoinData['currentIndex'])) {
                $results['altcoinSeason']['index'] = $altcoinData['currentIndex'];
                $results['altcoinSeason']['status'] = 'success';
                $this->info("✓ Altcoin Season Index updated: {$altcoinData['currentIndex']}%");
            } else {
                $results['altcoinSeason']['status'] = 'empty';
                $this->warn('⚠ Altcoin Season Index returned empty data');
            }
        } catch (\Exception $e) {
            $results['altcoinSeason']['status'] = 'failed';
            $results['altcoinSeason']['error'] = $e->getMessage();
            $this->error('✗ Failed to update Altcoin Season Index: ' . $e->getMessage());
            Log::error('Altcoin Season Index cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update RSI for Bitcoin
        try {
            $this->info('Updating Bitcoin RSI...');
            $rsiData = $this->updateRSI();
            
            if ($rsiData && isset($rsiData['value'])) {
                $results['rsi']['value'] = $rsiData['value'];
                $results['rsi']['status'] = 'success';
                $this->info("✓ Bitcoin RSI updated: {$rsiData['value']}");
            } else {
                $results['rsi']['status'] = 'empty';
                $this->warn('⚠ RSI returned empty data');
            }
        } catch (\Exception $e) {
            $results['rsi']['status'] = 'failed';
            $results['rsi']['error'] = $e->getMessage();
            $this->error('✗ Failed to update RSI: ' . $e->getMessage());
            Log::error('RSI cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        $duration = round(microtime(true) - $startTime, 2);
        
        // Display summary
        $this->info("\n" . 'Cache update completed in ' . $duration . ' seconds');
        $this->table(
            ['Indicator', 'Status', 'Details', 'Error'],
            [
                ['Pi Cycle Top', $results['piCycle']['status'], $results['piCycle']['dataPoints'] . ' points', $results['piCycle']['error'] ?? '-'],
                ['Rainbow Chart', $results['rainbow']['status'], $results['rainbow']['dataPoints'] . ' points', $results['rainbow']['error'] ?? '-'],
                ['Altcoin Season', $results['altcoinSeason']['status'], ($results['altcoinSeason']['index'] ?? '-') . '%', $results['altcoinSeason']['error'] ?? '-'],
                ['Bitcoin RSI', $results['rsi']['status'], $results['rsi']['value'] ?? '-', $results['rsi']['error'] ?? '-'],
            ]
        );
        
        // Log summary
        Log::info('Indicator cache update completed', [
            'duration' => $duration,
            'results' => $results
        ]);
        
        // Return success if at least one indicator updated successfully
        return ($results['piCycle']['status'] === 'success' || 
                $results['rainbow']['status'] === 'success' || 
                $results['altcoinSeason']['status'] === 'success' ||
                $results['rsi']['status'] === 'success') 
            ? Command::SUCCESS 
            : Command::FAILURE;
    }
    
    private function updatePiCycleTop()
    {
        $cacheKey = "pi_cycle_top_bitcoin_v2";
        $historicalCacheKey = "pi_cycle_historical_prices";
        
        // Get existing historical price data
        $existingPrices = Cache::get($historicalCacheKey, []);
        $lastDate = null;
        $daysToFetch = 14; // Default to last 14 days
        
        if (!empty($existingPrices)) {
            // Find the most recent date in our cache
            $lastPrice = end($existingPrices);
            $lastDate = $lastPrice['date'] ?? null;
            
            if ($lastDate) {
                // Calculate days since last update
                $daysSinceUpdate = Carbon::parse($lastDate)->diffInDays(now());
                $daysToFetch = min($daysSinceUpdate + 2, 2000); // Add 2 days buffer, max 2000
                
                Log::info("Pi Cycle: Last cached date is {$lastDate}, fetching {$daysToFetch} days");
            }
        } else {
            // No existing data, need full historical fetch
            $daysToFetch = 2000;
            Log::info("Pi Cycle: No existing cache, fetching full history ({$daysToFetch} days)");
        }
        
        // Fetch only the needed data
        $newPrices = [];
        
        try {
            if ($daysToFetch <= 365) {
                // For recent updates, use CoinGecko
                $marketResult = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', $daysToFetch, 'daily');
                $marketData = $marketResult['data'] ?? [];
                
                if (!empty($marketData['prices'])) {
                    foreach ($marketData['prices'] as $pricePoint) {
                        $timestamp = $pricePoint[0] / 1000;
                        $date = date('Y-m-d', $timestamp);
                        
                        // Only add if it's newer than our last cached date
                        if (!$lastDate || $date > $lastDate) {
                            $newPrices[] = [
                                'date' => $date,
                                'timestamp' => $timestamp,
                                'price' => $pricePoint[1]
                            ];
                        }
                    }
                }
                Log::info("Pi Cycle: Got " . count($newPrices) . " new days from CoinGecko");
            } else {
                // For full history, use CryptoCompare with API key
                $historicalData = $this->fetchCryptoCompareHistory($daysToFetch);
                if (!empty($historicalData)) {
                    // If we have existing data, filter to only new dates
                    if ($lastDate) {
                        foreach ($historicalData as $day) {
                            if ($day['date'] > $lastDate) {
                                $newPrices[] = $day;
                            }
                        }
                    } else {
                        $newPrices = $historicalData;
                    }
                    Log::info("Pi Cycle: Got " . count($newPrices) . " new days from CryptoCompare");
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to fetch new Pi Cycle data: " . $e->getMessage());
            
            // If we have existing data and fetch fails, continue with what we have
            if (empty($existingPrices)) {
                throw new \Exception("No historical data available and unable to fetch new data");
            }
        }
        
        // Merge new prices with existing ones
        $dailyPrices = $existingPrices;
        
        // Add new prices, avoiding duplicates
        $existingDates = array_column($existingPrices, 'date');
        foreach ($newPrices as $newPrice) {
            if (!in_array($newPrice['date'], $existingDates)) {
                $dailyPrices[] = $newPrice;
            }
        }
        
        // Sort by date to ensure chronological order
        usort($dailyPrices, function($a, $b) {
            return $a['timestamp'] - $b['timestamp'];
        });
        
        // Keep only last 2000 days to prevent cache from growing too large
        if (count($dailyPrices) > 2000) {
            $dailyPrices = array_slice($dailyPrices, -2000);
        }
        
        // Cache the historical prices FOREVER (they don't change)
        Cache::forever($historicalCacheKey, $dailyPrices);
        
        Log::info("Pi Cycle: Total price history: " . count($dailyPrices) . " days");
        
        // Calculate Pi Cycle Top indicators
        $result = [];
        $count = count($dailyPrices);
        
        for ($i = 0; $i < $count; $i++) {
            $dataPoint = [
                'date' => $dailyPrices[$i]['date'],
                'price' => round($dailyPrices[$i]['price'], 2),
                'ma111' => null,
                'ma350x2' => null,
                'isCrossover' => false,
                'timestamp' => $dailyPrices[$i]['timestamp'] * 1000
            ];
            
            // Calculate 111-day SMA
            if ($i >= 110) {
                $sum = 0;
                for ($j = $i - 110; $j <= $i; $j++) {
                    $sum += $dailyPrices[$j]['price'];
                }
                $dataPoint['ma111'] = round($sum / 111, 2);
            }
            
            // Calculate 350-day SMA × 2
            if ($i >= 349) {
                $sum = 0;
                for ($j = $i - 349; $j <= $i; $j++) {
                    $sum += $dailyPrices[$j]['price'];
                }
                $dataPoint['ma350x2'] = round(($sum / 350) * 2, 2);
            }
            
            // Check for crossover
            if ($i > 349 && $i > 0) {
                $prev = $result[$i - 1];
                if ($prev['ma111'] !== null && $prev['ma350x2'] !== null &&
                    $dataPoint['ma111'] !== null && $dataPoint['ma350x2'] !== null) {
                    
                    // Check if 111 MA crossed above 350 MA x 2
                    if ($prev['ma111'] <= $prev['ma350x2'] && 
                        $dataPoint['ma111'] > $dataPoint['ma350x2']) {
                        $dataPoint['isCrossover'] = true;
                        Log::info("Pi Cycle Top crossover detected on " . $dataPoint['date'] . " at price $" . $dataPoint['price']);
                    }
                }
            }
            
            $result[] = $dataPoint;
        }
        
        // Cache the result with metadata
        $metaKey = $cacheKey . '_meta';
        Cache::put($cacheKey, $result, 86400); // Cache for 24 hours
        Cache::put($metaKey, [
            'timestamp' => now()->toIso8601String(),
            'source' => 'api'
        ], 86400);
        
        return [
            'dataPoints' => count($result),
            'lastDate' => $result[count($result) - 1]['date'] ?? null
        ];
    }
    
    // Moved to AltcoinSeasonRepository
    /*
    private function updateAltcoinSeasonIndex()
    {
        $cacheKey = 'altcoin_season_index';
        
        // Use rememberWithoutFreshness to always return cache if available
        $result = $this->cacheService->rememberWithoutFreshness($cacheKey, function () {
            // Get top 50 coins by market cap
            $marketsResponse = $this->coinGeckoService->getMarkets('usd', null, 50);
            $markets = $marketsResponse['data'] ?? [];
            
            if (empty($markets)) {
                throw new \Exception('No market data available');
            }
            
            // Get Bitcoin's performance - prefer 90d but use what's available
            $btcPerformance = 0;
            $btcPeriodUsed = 'none';
            $periodField = null;
            
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') {
                    // Check which period we have data for (prefer longer periods)
                    if (isset($coin['price_change_percentage_90d_in_currency']) && $coin['price_change_percentage_90d_in_currency'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_90d_in_currency'];
                        $btcPeriodUsed = '90d';
                        $periodField = 'price_change_percentage_90d_in_currency';
                    } elseif (isset($coin['price_change_percentage_30d_in_currency']) && $coin['price_change_percentage_30d_in_currency'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_30d_in_currency'];
                        $btcPeriodUsed = '30d';
                        $periodField = 'price_change_percentage_30d_in_currency';
                    } elseif (isset($coin['price_change_percentage_7d_in_currency']) && $coin['price_change_percentage_7d_in_currency'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_7d_in_currency'];
                        $btcPeriodUsed = '7d';
                        $periodField = 'price_change_percentage_7d_in_currency';
                    } elseif (isset($coin['price_change_percentage_24h']) && $coin['price_change_percentage_24h'] !== null) {
                        $btcPerformance = $coin['price_change_percentage_24h'];
                        $btcPeriodUsed = '24h';
                        $periodField = 'price_change_percentage_24h';
                    }
                    
                    Log::info("Altcoin Season Update: Bitcoin performance {$btcPerformance}% over {$btcPeriodUsed}", [
                        'field' => $periodField,
                        'value' => $btcPerformance
                    ]);
                    break;
                }
            }
            
            // Count how many altcoins outperformed Bitcoin
            $outperformingCount = 0;
            $topPerformers = [];
            
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') continue;
                
                // Use the same period data as Bitcoin
                $coinPerformance = 0;
                if ($periodField && isset($coin[$periodField])) {
                    $coinPerformance = $coin[$periodField];
                } else {
                    // Fallback to any available data if the same period isn't available
                    $coinPerformance = $coin['price_change_percentage_30d_in_currency'] ?? 
                                      $coin['price_change_percentage_7d_in_currency'] ?? 
                                      $coin['price_change_percentage_24h'] ?? 0;
                }
                
                if ($coinPerformance > $btcPerformance) {
                    $outperformingCount++;
                    $topPerformers[] = [
                        'id' => $coin['id'],
                        'symbol' => $coin['symbol'],
                        'name' => $coin['name'],
                        'performance' => round($coinPerformance, 2),
                        'rank' => $coin['market_cap_rank']
                    ];
                }
            }
            
            // Sort top performers
            usort($topPerformers, function($a, $b) {
                return $b['performance'] <=> $a['performance'];
            });
            
            // Calculate index (percentage of top 50 that outperformed BTC)
            $currentIndex = round(($outperformingCount / 49) * 100); // 49 because we exclude BTC
            
            // Generate historical data
            $historicalData = $this->generateAltcoinHistoricalData($currentIndex);
            
            return [
                'currentIndex' => $currentIndex,
                'outperformingCount' => $outperformingCount,
                'totalCoins' => 49, // Excluding Bitcoin
                'btcPerformance' => round($btcPerformance, 2),
                'periodUsed' => $btcPeriodUsed,
                'topPerformers' => array_slice($topPerformers, 0, 10),
                'historicalData' => $historicalData
            ];
        });
        
        return $result['data'] ?? null;
    }
    */
    
    private function updateRSI()
    {
        // Use CoinGecko price data for RSI calculation to ensure current data
        try {
            $chartResult = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', 30);
            $historicalPrices = $chartResult['data'] ?? [];
            
            if (!empty($historicalPrices['prices']) && count($historicalPrices['prices']) >= 15) {
                $rsiData = $this->calculateRSIFromPrices($historicalPrices['prices'], 14);
                
                if (isset($rsiData['Technical Analysis: RSI'])) {
                    $rsiValues = $rsiData['Technical Analysis: RSI'];
                    $latestDate = array_key_first($rsiValues);
                    
                    // Store the calculated RSI data in the cache that AlphaVantageService reads from
                    $cacheKey = "av_RSI_BTCUSD_daily_14";
                    $this->cacheService->storeWithMetadata($cacheKey, $rsiData);
                    
                    return [
                        'value' => round(floatval($rsiValues[$latestDate]['RSI']), 2),
                        'date' => $latestDate
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::error('RSI calculation failed: ' . $e->getMessage());
        }
        
        // Only fallback to Alpha Vantage if CoinGecko fails
        try {
            $rsiResult = $this->alphaVantageService->getRSI('BTCUSD', 'daily', 14);
            $rsiData = $rsiResult['data'] ?? [];
            
            if (isset($rsiData['Technical Analysis: RSI'])) {
                $rsiValues = $rsiData['Technical Analysis: RSI'];
                $latestDate = array_key_first($rsiValues);
                
                // Store the full RSI data in the cache that AlphaVantageService reads from
                $cacheKey = "av_RSI_BTCUSD_daily_14";
                $this->cacheService->storeWithMetadata($cacheKey, $rsiData);
                
                return [
                    'value' => round(floatval($rsiValues[$latestDate]['RSI']), 2),
                    'date' => $latestDate
                ];
            }
        } catch (\Exception $e) {
            Log::warning('Alpha Vantage RSI failed: ' . $e->getMessage());
        }
        
        return null;
    }
    
    private function fetchCryptoCompareHistory($limit = 2000)
    {
        $url = 'https://min-api.cryptocompare.com/data/v2/histoday';
        $params = [
            'fsym' => 'BTC',
            'tsym' => 'USD',
            'limit' => $limit,
            'aggregate' => 1,
            'api_key' => config('services.cryptocompare.key')
        ];
        
        $response = Http::timeout(30)->get($url, $params);
        
        if ($response->successful()) {
            $data = $response->json();
            
            // Check for rate limit
            if (isset($data['Response']) && $data['Response'] === 'Error') {
                throw new \Exception("CryptoCompare API error: " . ($data['Message'] ?? 'Unknown error'));
            }
            
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
        
        throw new \Exception('Failed to fetch CryptoCompare history: ' . $response->status());
    }
    
    // Moved to AltcoinSeasonRepository
    /*
    private function generateAltcoinHistoricalData($currentIndex)
    {
        $data = [];
        $baseIndex = $currentIndex;
        
        // Generate 30 days of historical data
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $variation = sin($i * 0.3) * 15; // Sinusoidal variation
            $randomNoise = rand(-5, 5); // Random noise
            $index = max(0, min(100, $baseIndex + $variation + $randomNoise));
            
            $data[] = [
                'date' => $date->toDateString(),
                'index' => round($index),
                'outperformingCount' => round(($index / 100) * 49)
            ];
        }
        
        // Ensure the last point matches current index
        $data[count($data) - 1]['index'] = $currentIndex;
        $data[count($data) - 1]['outperformingCount'] = round(($currentIndex / 100) * 49);
        
        return $data;
    }
    */
    
    private function calculateRSIFromPrices($prices, $period = 14)
    {
        if (count($prices) < $period + 1) {
            return [];
        }
        
        $priceValues = array_map(function($item) {
            return $item[1];
        }, $prices);
        
        $changes = [];
        for ($i = 1; $i < count($priceValues); $i++) {
            $changes[] = $priceValues[$i] - $priceValues[$i - 1];
        }
        
        $rsiValues = [];
        $gains = [];
        $losses = [];
        
        for ($i = 0; $i < $period; $i++) {
            if ($changes[$i] > 0) {
                $gains[] = $changes[$i];
                $losses[] = 0;
            } else {
                $gains[] = 0;
                $losses[] = abs($changes[$i]);
            }
        }
        
        $avgGain = array_sum($gains) / $period;
        $avgLoss = array_sum($losses) / $period;
        
        for ($i = $period; $i < count($changes); $i++) {
            $gain = $changes[$i] > 0 ? $changes[$i] : 0;
            $loss = $changes[$i] < 0 ? abs($changes[$i]) : 0;
            
            $avgGain = (($avgGain * ($period - 1)) + $gain) / $period;
            $avgLoss = (($avgLoss * ($period - 1)) + $loss) / $period;
            
            if ($avgLoss == 0) {
                $rsi = 100;
            } else {
                $rs = $avgGain / $avgLoss;
                $rsi = 100 - (100 / (1 + $rs));
            }
            
            $date = date('Y-m-d', $prices[$i + 1][0] / 1000);
            $rsiValues[$date] = ['RSI' => number_format($rsi, 2)];
        }
        
        return ['Technical Analysis: RSI' => array_reverse(array_slice($rsiValues, -30, null, true), true)];
    }
}