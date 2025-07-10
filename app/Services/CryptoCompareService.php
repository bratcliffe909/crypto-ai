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
     */
    private function calculateSentimentFromPrice($data)
    {
        $score = 50; // Neutral baseline
        
        // 24h change
        if (isset($data['CHANGEPCT24HOUR'])) {
            $change24h = floatval($data['CHANGEPCT24HOUR']);
            if ($change24h > 5) $score += 15;
            elseif ($change24h > 2) $score += 10;
            elseif ($change24h > 0) $score += 5;
            elseif ($change24h < -5) $score -= 15;
            elseif ($change24h < -2) $score -= 10;
            elseif ($change24h < 0) $score -= 5;
        }
        
        // Volume change
        if (isset($data['VOLUME24HOUR']) && isset($data['VOLUME24HOURTO'])) {
            $volume = floatval($data['VOLUME24HOURTO']);
            $avgVolume = floatval($data['VOLUME24HOUR']) * floatval($data['PRICE']);
            if ($avgVolume > 0 && $volume > $avgVolume * 1.5) $score += 10;
            elseif ($avgVolume > 0 && $volume < $avgVolume * 0.5) $score -= 10;
        }
        
        // Keep within 0-100 range
        return max(0, min(100, $score));
    }
    
    /**
     * Get signal from price data
     */
    private function getSignalFromPrice($data)
    {
        if (!isset($data['CHANGEPCT24HOUR'])) return 'neutral';
        
        $change = floatval($data['CHANGEPCT24HOUR']);
        if ($change > 2) return 'bullish';
        if ($change < -2) return 'bearish';
        return 'neutral';
    }
    
}