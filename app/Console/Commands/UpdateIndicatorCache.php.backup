<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RainbowChartService;
use App\Services\CoinGeckoService;
use App\Services\AlphaVantageService;
use App\Services\CacheService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class UpdateIndicatorCache extends Command
{
    protected $signature = 'cache:update-indicators {--force : Force update even if cache is fresh}';
    protected $description = 'Update Redis cache for Pi Cycle Top, Rainbow Chart, Altcoin Season Index, and RSI';

    protected $rainbowChartService;
    protected $coinGeckoService;
    protected $alphaVantageService;
    protected $cacheService;

    public function __construct(
        RainbowChartService $rainbowChartService,
        CoinGeckoService $coinGeckoService,
        AlphaVantageService $alphaVantageService,
        CacheService $cacheService
    )
    {
        parent::__construct();
        $this->rainbowChartService = $rainbowChartService;
        $this->coinGeckoService = $coinGeckoService;
        $this->alphaVantageService = $alphaVantageService;
        $this->cacheService = $cacheService;
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
        
        // Update Rainbow Chart
        try {
            $this->info('Updating Bitcoin Rainbow Chart...');
            $rainbowData = $this->rainbowChartService->getRainbowChartData('max');
            
            if (!empty($rainbowData['data'])) {
                $results['rainbow']['dataPoints'] = count($rainbowData['data']);
                $results['rainbow']['status'] = 'success';
                $this->info("✓ Rainbow Chart updated: " . count($rainbowData['data']) . " data points");
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
            $altcoinData = $this->updateAltcoinSeasonIndex();
            
            if ($altcoinData) {
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
        
        // Force update by clearing existing cache
        Cache::forget($cacheKey);
        
        // Fetch and cache new data
        $dailyPrices = [];
        
        // Try to get historical data from CryptoCompare (free, up to 2000 days)
        try {
            $historicalData = $this->fetchCryptoCompareHistory();
            if (!empty($historicalData)) {
                $dailyPrices = $historicalData;
                Log::info("Pi Cycle: Got " . count($dailyPrices) . " days from CryptoCompare");
            }
        } catch (\Exception $e) {
            Log::warning("CryptoCompare failed for Pi Cycle: " . $e->getMessage());
        }
        
        // If CryptoCompare fails, fall back to CoinGecko
        if (empty($dailyPrices)) {
            $marketResult = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', 365, 'daily');
            $marketData = $marketResult['data'] ?? [];
            
            if (!empty($marketData['prices'])) {
                foreach ($marketData['prices'] as $pricePoint) {
                    $timestamp = $pricePoint[0] / 1000;
                    $dailyPrices[] = [
                        'date' => date('Y-m-d', $timestamp),
                        'timestamp' => $timestamp,
                        'price' => $pricePoint[1]
                    ];
                }
            }
        }
        
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
            
            // Get Bitcoin's 90-day performance
            $btcPerformance = 0;
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') {
                    $btcPerformance = $coin['price_change_percentage_90d_in_currency'] ?? 
                                     $coin['price_change_percentage_30d_in_currency'] ?? 
                                     $coin['price_change_percentage_7d_in_currency'] ?? 
                                     $coin['price_change_percentage_24h'] ?? 0;
                    break;
                }
            }
            
            // Count how many altcoins outperformed Bitcoin
            $outperformingCount = 0;
            $topPerformers = [];
            
            foreach ($markets as $coin) {
                if ($coin['id'] === 'bitcoin') continue;
                
                $coinPerformance = $coin['price_change_percentage_90d_in_currency'] ?? 
                                  $coin['price_change_percentage_30d_in_currency'] ?? 
                                  $coin['price_change_percentage_7d_in_currency'] ?? 
                                  $coin['price_change_percentage_24h'] ?? 0;
                
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
            
            // Calculate index
            $currentIndex = round(($outperformingCount / 49) * 100);
            
            return [
                'currentIndex' => $currentIndex,
                'outperformingCount' => $outperformingCount,
                'totalCoins' => 49,
                'btcPerformance' => round($btcPerformance, 2),
                'topPerformers' => array_slice($topPerformers, 0, 10)
            ];
        });
        
        return $result['data'] ?? null;
    }
    
    private function updateRSI()
    {
        // Try Alpha Vantage first
        try {
            $rsiResult = $this->alphaVantageService->getRSI('BTCUSD', 'daily', 14);
            $rsiData = $rsiResult['data'] ?? [];
            
            if (isset($rsiData['Technical Analysis: RSI'])) {
                $rsiValues = $rsiData['Technical Analysis: RSI'];
                $latestDate = array_key_first($rsiValues);
                return [
                    'value' => round(floatval($rsiValues[$latestDate]['RSI']), 2),
                    'date' => $latestDate
                ];
            }
        } catch (\Exception $e) {
            Log::warning('Alpha Vantage RSI failed: ' . $e->getMessage());
        }
        
        // Fallback: Calculate RSI from price data
        try {
            $chartResult = $this->coinGeckoService->getMarketChart('bitcoin', 'usd', 30);
            $historicalPrices = $chartResult['data'] ?? [];
            
            if (!empty($historicalPrices['prices']) && count($historicalPrices['prices']) >= 15) {
                $rsiData = $this->calculateRSIFromPrices($historicalPrices['prices'], 14);
                
                if (isset($rsiData['Technical Analysis: RSI'])) {
                    $rsiValues = $rsiData['Technical Analysis: RSI'];
                    $latestDate = array_key_first($rsiValues);
                    return [
                        'value' => round(floatval($rsiValues[$latestDate]['RSI']), 2),
                        'date' => $latestDate
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::error('RSI calculation failed: ' . $e->getMessage());
        }
        
        return null;
    }
    
    private function fetchCryptoCompareHistory()
    {
        $url = 'https://min-api.cryptocompare.com/data/v2/histoday';
        $params = [
            'fsym' => 'BTC',
            'tsym' => 'USD',
            'limit' => 2000,
            'aggregate' => 1
        ];
        
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
    }
    
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
        
        return ['Technical Analysis: RSI' => array_slice($rsiValues, -30, null, true)];
    }
}
