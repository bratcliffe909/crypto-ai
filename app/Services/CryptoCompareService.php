<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CryptoCompareService
{
    private $baseUrl = 'https://min-api.cryptocompare.com/data';
    private $apiKey;
    private $cacheService;

    public function __construct(CacheService $cacheService)
    {
        $this->apiKey = config('services.cryptocompare.key');
        $this->cacheService = $cacheService;
    }

    /**
     * Get market sentiment data aggregated from top coins
     */
    public function getMarketSentiment()
    {
        $cacheKey = "cryptocompare_market_sentiment";
        
        return $this->cacheService->rememberWithoutFreshness($cacheKey, function () {
            return $this->fetchMarketSentiment();
        });
    }

    /**
     * Get social activity data (uses volume as proxy)
     */
    public function getSocialActivity($days = 30)
    {
        $cacheKey = "cryptocompare_social_activity_{$days}";
        
        return $this->cacheService->rememberWithoutFreshness($cacheKey, function () use ($days) {
            return $this->fetchSocialActivity($days);
        });
    }

    /**
     * Get market sentiment directly from API (for cache updates)
     */
    public function getMarketSentimentDirect()
    {
        $cacheKey = "cryptocompare_market_sentiment";
        $result = $this->fetchMarketSentiment();
        
        // Store in cache
        $this->cacheService->storeWithMetadata($cacheKey, $result);
        
        return $this->cacheService->formatResponsePublic($result, now(), 0, 'primary');
    }

    /**
     * Get social activity directly from API (for cache updates)
     */
    public function getSocialActivityDirect($days = 30)
    {
        $cacheKey = "cryptocompare_social_activity_{$days}";
        $result = $this->fetchSocialActivity($days);
        
        // Store in cache
        $this->cacheService->storeWithMetadata($cacheKey, $result);
        
        return $this->cacheService->formatResponsePublic($result, now(), 0, 'primary');
    }

    /**
     * Fetch market sentiment data
     */
    private function fetchMarketSentiment()
    {
        $topCoins = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'DOT', 'AVAX', 'MATIC'];
        $sentimentData = [];
        
        try {
            // Get price data for top coins
            $symbols = implode(',', $topCoins);
            $response = Http::timeout(10)->get("{$this->baseUrl}/pricemultifull", [
                'fsyms' => $symbols,
                'tsyms' => 'USD',
                'api_key' => $this->apiKey
            ]);
            
            $responseData = $response->json();
            
            // Check for rate limit error
            if (isset($responseData['Response']) && $responseData['Response'] === 'Error') {
                Log::warning("CryptoCompare API error", [
                    'message' => $responseData['Message'] ?? 'Unknown error',
                    'type' => $responseData['Type'] ?? 'Unknown'
                ]);
                
                // Return empty result - let cache handle it
                throw new \Exception("CryptoCompare API rate limited: " . ($responseData['Message'] ?? 'Unknown error'));
            }
            
            if ($response->successful() && isset($responseData['RAW'])) {
                $rawData = $responseData['RAW'];
                
                foreach ($topCoins as $symbol) {
                    if (isset($rawData[$symbol]['USD'])) {
                        $data = $rawData[$symbol]['USD'];
                        $sentimentData[$symbol] = [
                            'sentiment' => $this->calculateSentimentFromPrice($data),
                            'signal' => $this->getSignalFromPrice($data)
                        ];
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to get market sentiment", ['error' => $e->getMessage()]);
        }
        
        // Calculate average sentiment
        $totalSentiment = 0;
        $bullishCount = 0;
        $bearishCount = 0;
        
        foreach ($sentimentData as $coin => $data) {
            $totalSentiment += $data['sentiment'];
            if ($data['signal'] === 'bullish') $bullishCount++;
            if ($data['signal'] === 'bearish') $bearishCount++;
        }
        
        $coinsAnalyzed = count($sentimentData);
        
        // If no data was retrieved, throw exception
        if ($coinsAnalyzed === 0) {
            throw new \Exception("No sentiment data could be calculated");
        }
        
        $avgSentiment = $totalSentiment / $coinsAnalyzed;
        
        return [
            'sentiment_score' => round($avgSentiment, 2),
            'bullish_percentage' => round(($bullishCount / count($topCoins)) * 100, 2),
            'bearish_percentage' => round(($bearishCount / count($topCoins)) * 100, 2),
            'neutral_percentage' => round(((count($topCoins) - $bullishCount - $bearishCount) / count($topCoins)) * 100, 2),
            'coins_analyzed' => $coinsAnalyzed,
            'timestamp' => now()->toIso8601String()
        ];
    }

    /**
     * Fetch social activity data
     */
    private function fetchSocialActivity($days)
    {
        $historicalData = [];
        
        try {
            // Get historical daily data for BTC as market leader
            $limit = min($days - 1, 2000); // API limit
            $response = Http::timeout(15)->get("{$this->baseUrl}/v2/histoday", [
                'fsym' => 'BTC',
                'tsym' => 'USD',
                'limit' => $limit,
                'api_key' => $this->apiKey
            ]);
            
            if ($response->successful() && isset($response->json()['Data']['Data'])) {
                $btcData = $response->json()['Data']['Data'];
                
                foreach ($btcData as $day) {
                    $date = Carbon::createFromTimestamp($day['time']);
                    $volume = $day['volumeto'] ?? 0;
                    
                    $historicalData[] = [
                        'date' => $date->format('Y-m-d'),
                        'social_volume' => $volume,
                        'normalized' => 0
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to get historical data", ['error' => $e->getMessage()]);
        }
        
        // If no data, throw exception - let cache handle it
        if (count($historicalData) < 1) {
            throw new \Exception("No historical data available from CryptoCompare");
        }
        
        // Normalize the data (0-100 scale)
        if (count($historicalData) > 0) {
            $volumes = array_column($historicalData, 'social_volume');
            $maxVolume = max($volumes);
            $minVolume = min($volumes);
            
            foreach ($historicalData as &$day) {
                if ($maxVolume > $minVolume) {
                    $day['normalized'] = round((($day['social_volume'] - $minVolume) / ($maxVolume - $minVolume)) * 100, 2);
                } else {
                    $day['normalized'] = 50;
                }
            }
        }
        
        return [
            'historical_data' => array_slice($historicalData, -$days),
            'period_days' => $days,
            'coins_tracked' => ['BTC', 'ETH', 'BNB', 'XRP', 'ADA'],
            'timestamp' => now()->toIso8601String()
        ];
    }

    /**
     * Calculate sentiment score from price action
     * @deprecated Use SentimentRepository::calculateSentimentFromPrice() instead
     */
    private function calculateSentimentFromPrice($data)
    {
        $sentimentRepository = app(\App\Repositories\SentimentRepository::class);
        return $sentimentRepository->calculateSentimentFromPrice($data);
    }
    
    /**
     * Get signal from price data
     * @deprecated Use SentimentRepository::getSignalFromPrice() instead
     */
    private function getSignalFromPrice($data)
    {
        $sentimentRepository = app(\App\Repositories\SentimentRepository::class);
        return $sentimentRepository->getSignalFromPrice($data);
    }
    
    /**
     * Get market data with 90-day performance from CryptoCompare
     */
    public function getTopCoinsWithPerformance($limit = 50)
    {
        $cacheKey = "cryptocompare_top_{$limit}_with_90d";
        
        return $this->cacheService->rememberWithoutFreshness($cacheKey, function () use ($limit) {
            try {
                // Get top coins by market cap with full data
                $response = Http::timeout(15)->get("{$this->baseUrl}/top/mktcapfull", [
                    'limit' => $limit,
                    'tsym' => 'USD',
                    'api_key' => $this->apiKey
                ]);
                
                if (!$response->successful()) {
                    throw new \Exception("Failed to get top coins from CryptoCompare");
                }
                
                $data = $response->json();
                
                // Check for rate limit
                if (isset($data['Response']) && $data['Response'] === 'Error') {
                    throw new \Exception("CryptoCompare API error: " . ($data['Message'] ?? 'Unknown error'));
                }
                
                $coinsWithPerformance = [];
                
                if (isset($data['Data'])) {
                    // Get current timestamp and 90 days ago timestamp
                    $now = Carbon::now();
                    $timestamp90DaysAgo = $now->copy()->subDays(90)->timestamp;
                    
                    // Collect all symbols for batch historical data request
                    $symbols = [];
                    foreach ($data['Data'] as $coin) {
                        if (isset($coin['CoinInfo']['Name'])) {
                            $symbols[] = $coin['CoinInfo']['Name'];
                        }
                    }
                    
                    // Get current prices for all symbols
                    $symbolsStr = implode(',', $symbols);
                    $currentPricesResponse = Http::timeout(10)->get("{$this->baseUrl}/pricemulti", [
                        'fsyms' => $symbolsStr,
                        'tsyms' => 'USD',
                        'api_key' => $this->apiKey
                    ]);
                    
                    $currentPrices = [];
                    if ($currentPricesResponse->successful()) {
                        $currentPrices = $currentPricesResponse->json();
                    }
                    
                    // Get historical price for each coin at 90 days ago
                    // We'll batch this by getting daily historical data
                    foreach ($data['Data'] as $index => $coin) {
                        if (isset($coin['CoinInfo']['Name'])) {
                            $symbol = $coin['CoinInfo']['Name'];
                            $coinId = strtolower($coin['CoinInfo']['Name']);
                            
                            // Map common symbols to CoinGecko IDs
                            $idMapping = [
                                'btc' => 'bitcoin',
                                'eth' => 'ethereum',
                                'usdt' => 'tether',
                                'bnb' => 'binancecoin',
                                'xrp' => 'ripple',
                                'ada' => 'cardano',
                                'doge' => 'dogecoin',
                                'sol' => 'solana',
                                'dot' => 'polkadot',
                                'matic' => 'polygon-pos',
                                'shib' => 'shiba-inu',
                                'trx' => 'tron',
                                'avax' => 'avalanche-2',
                                'link' => 'chainlink',
                                'atom' => 'cosmos',
                                'ltc' => 'litecoin',
                                'etc' => 'ethereum-classic',
                                'xlm' => 'stellar',
                                'bch' => 'bitcoin-cash'
                            ];
                            
                            $geckoId = $idMapping[$coinId] ?? $coinId;
                            
                            // Calculate 90-day performance
                            $change90d = $this->calculate90DayChange($symbol);
                            
                            if ($change90d !== null) {
                                $coinsWithPerformance[] = [
                                    'id' => $geckoId,
                                    'symbol' => strtolower($symbol),
                                    'name' => $coin['CoinInfo']['FullName'] ?? $symbol,
                                    'rank' => $index + 1,
                                    'price_change_percentage_90d_in_currency' => $change90d,
                                    'current_price' => $currentPrices[$symbol]['USD'] ?? 0
                                ];
                            }
                        }
                    }
                }
                
                return $coinsWithPerformance;
                
            } catch (\Exception $e) {
                Log::error("Failed to get top coins with performance from CryptoCompare", ['error' => $e->getMessage()]);
                throw $e;
            }
        });
    }
    
    /**
     * Calculate 90-day change for a specific coin
     */
    private function calculate90DayChange($symbol)
    {
        try {
            // Get 90 days of historical data
            $response = Http::timeout(10)->get("{$this->baseUrl}/v2/histoday", [
                'fsym' => $symbol,
                'tsym' => 'USD',
                'limit' => 90,
                'api_key' => $this->apiKey
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Data']['Data']) && count($data['Data']['Data']) >= 90) {
                    $historicalData = $data['Data']['Data'];
                    
                    // Get price from 90 days ago (first entry)
                    $price90DaysAgo = $historicalData[0]['close'] ?? null;
                    
                    // Get current price (last entry)
                    $currentPrice = $historicalData[count($historicalData) - 1]['close'] ?? null;
                    
                    if ($price90DaysAgo && $currentPrice && $price90DaysAgo > 0) {
                        // Calculate percentage change
                        $change = (($currentPrice - $price90DaysAgo) / $price90DaysAgo) * 100;
                        return round($change, 2);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to calculate 90-day change for {$symbol}", ['error' => $e->getMessage()]);
        }
        
        return null;
    }
}