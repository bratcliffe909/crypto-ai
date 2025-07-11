<?php

namespace App\Repositories;

use App\Services\CacheService;
use App\Services\AlternativeService;
use App\Services\CryptoCompareService;
use Illuminate\Support\Facades\Log;

class SentimentRepository extends BaseRepository
{
    private AlternativeService $alternativeService;
    private ?CryptoCompareService $cryptoCompareService;

    public function __construct(
        CacheService $cacheService,
        AlternativeService $alternativeService,
        ?CryptoCompareService $cryptoCompareService = null
    ) {
        parent::__construct($cacheService);
        $this->alternativeService = $alternativeService;
        $this->cryptoCompareService = $cryptoCompareService;
    }

    /**
     * Get the cache prefix for sentiment data
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'sentiment';
    }

    /**
     * Get Fear & Greed Index data
     *
     * @param int $limit
     * @return array
     */
    public function getFearGreedIndex(int $limit = 30): array
    {
        $this->logOperation('getFearGreedIndex', ['limit' => $limit]);
        
        return $this->alternativeService->getFearGreedIndex($limit);
    }

    /**
     * Calculate market sentiment from multiple sources
     *
     * @return array
     */
    public function calculateAggregatedSentiment(): array
    {
        $this->logOperation('calculateAggregatedSentiment');
        
        $overallSentiment = 50; // Default neutral
        $components = [
            'fear_greed' => null,
            'social_sentiment' => null,
            'market_momentum' => null,
            'volatility_index' => null
        ];
        $sources = [];
        
        try {
            // Get Fear & Greed Index
            $fearGreedData = $this->getFearGreedIndex(1);
            if (isset($fearGreedData['data'][0]['value'])) {
                $fearGreedValue = intval($fearGreedData['data'][0]['value']);
                $components['fear_greed'] = $fearGreedValue;
                $sources[] = 'fear_greed_index';
            }
            
            // Get market sentiment from CryptoCompare
            if ($this->cryptoCompareService) {
                try {
                    $marketSentiment = $this->cryptoCompareService->getMarketSentiment();
                    if (isset($marketSentiment['data']['sentiment_score'])) {
                        $components['market_momentum'] = $marketSentiment['data']['sentiment_score'];
                        $sources[] = 'cryptocompare_sentiment';
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to get CryptoCompare sentiment', ['error' => $e->getMessage()]);
                }
            }
            
            // Calculate overall sentiment (weighted average of available components)
            $validComponents = array_filter($components, function($value) {
                return $value !== null;
            });
            
            if (count($validComponents) > 0) {
                $overallSentiment = round(array_sum($validComponents) / count($validComponents));
            }
            
        } catch (\Exception $e) {
            Log::error('Failed to calculate aggregated sentiment', ['error' => $e->getMessage()]);
        }
        
        $sentimentInfo = $this->interpretSentiment($overallSentiment);
        
        return [
            'overall_sentiment' => $overallSentiment,
            'sentiment_label' => $sentimentInfo['classification'],
            'sentiment_description' => $sentimentInfo['description'],
            'components' => $components,
            'metadata' => [
                'lastUpdated' => now()->toIso8601String(),
                'sources' => $sources
            ]
        ];
    }

    /**
     * Get social activity metrics
     *
     * @param int $days
     * @return array
     */
    public function getSocialActivityMetrics(int $days = 30): array
    {
        $this->logOperation('getSocialActivityMetrics', ['days' => $days]);
        
        if (!$this->cryptoCompareService) {
            return [
                'error' => 'CryptoCompare service not available',
                'historical_data' => [],
                'period_days' => $days
            ];
        }
        
        try {
            return $this->cryptoCompareService->getSocialActivity($days);
        } catch (\Exception $e) {
            Log::error('Failed to get social activity metrics', ['error' => $e->getMessage()]);
            return [
                'error' => 'Failed to fetch social activity',
                'historical_data' => [],
                'period_days' => $days
            ];
        }
    }

    /**
     * Process sentiment indicators
     *
     * @param array $data
     * @return array
     */
    public function processSentimentIndicators(array $data): array
    {
        $this->logOperation('processSentimentIndicators', [
            'dataCount' => count($data)
        ]);
        
        $indicators = [];
        
        // Process Fear & Greed data if available
        if (isset($data['fear_greed']) && is_array($data['fear_greed'])) {
            $values = array_column($data['fear_greed'], 'value');
            $indicators['fear_greed'] = [
                'current' => $values[0] ?? null,
                'average' => !empty($values) ? round(array_sum($values) / count($values)) : null,
                'min' => !empty($values) ? min($values) : null,
                'max' => !empty($values) ? max($values) : null,
                'trend' => $this->calculateTrend($values)
            ];
        }
        
        // Process market sentiment if available
        if (isset($data['market_sentiment'])) {
            $indicators['market_sentiment'] = [
                'score' => $data['market_sentiment']['sentiment_score'] ?? null,
                'bullish_percentage' => $data['market_sentiment']['bullish_percentage'] ?? null,
                'bearish_percentage' => $data['market_sentiment']['bearish_percentage'] ?? null,
                'neutral_percentage' => $data['market_sentiment']['neutral_percentage'] ?? null
            ];
        }
        
        // Process social activity if available
        if (isset($data['social_activity']) && isset($data['social_activity']['historical_data'])) {
            $socialData = $data['social_activity']['historical_data'];
            $normalizedValues = array_column($socialData, 'normalized');
            
            $indicators['social_activity'] = [
                'current' => end($normalizedValues) ?: null,
                'average' => !empty($normalizedValues) ? round(array_sum($normalizedValues) / count($normalizedValues)) : null,
                'trend' => $this->calculateTrend($normalizedValues)
            ];
        }
        
        return [
            'processed' => true,
            'indicators' => $indicators,
            'timestamp' => now()->toIso8601String()
        ];
    }
    
    /**
     * Calculate trend from array of values
     *
     * @param array $values
     * @return string
     */
    private function calculateTrend(array $values): string
    {
        if (count($values) < 2) {
            return 'insufficient_data';
        }
        
        // Compare first half average with second half average
        $midpoint = floor(count($values) / 2);
        $firstHalf = array_slice($values, 0, $midpoint);
        $secondHalf = array_slice($values, $midpoint);
        
        $firstAvg = array_sum($firstHalf) / count($firstHalf);
        $secondAvg = array_sum($secondHalf) / count($secondHalf);
        
        $change = (($secondAvg - $firstAvg) / $firstAvg) * 100;
        
        if ($change > 10) return 'increasing';
        if ($change < -10) return 'decreasing';
        return 'stable';
    }

    /**
     * Get historical sentiment data
     *
     * @param int $days
     * @return array
     */
    public function getHistoricalSentiment(int $days = 90): array
    {
        $this->logOperation('getHistoricalSentiment', ['days' => $days]);
        
        $dates = [];
        $values = [];
        $labels = [];
        
        try {
            // Get Fear & Greed historical data
            $fearGreedData = $this->getFearGreedIndex($days);
            
            if (isset($fearGreedData['data']) && is_array($fearGreedData['data'])) {
                foreach ($fearGreedData['data'] as $entry) {
                    if (isset($entry['timestamp']) && isset($entry['value'])) {
                        $date = date('Y-m-d', intval($entry['timestamp']));
                        $dates[] = $date;
                        $values[] = intval($entry['value']);
                        $labels[] = $entry['value_classification'] ?? $this->interpretSentiment(intval($entry['value']))['classification'];
                    }
                }
                
                // Reverse arrays to have oldest date first
                $dates = array_reverse($dates);
                $values = array_reverse($values);
                $labels = array_reverse($labels);
            }
            
        } catch (\Exception $e) {
            Log::error('Failed to get historical sentiment', ['error' => $e->getMessage()]);
        }
        
        return [
            'dates' => $dates,
            'values' => $values,
            'labels' => $labels,
            'metadata' => [
                'source' => 'fear_greed_index',
                'period_days' => $days,
                'data_points' => count($dates)
            ]
        ];
    }

    /**
     * Validate sentiment data
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Validate Fear & Greed format
        if (isset($data['data']) && is_array($data['data'])) {
            foreach ($data['data'] as $entry) {
                if (!isset($entry['value']) || !isset($entry['value_classification'])) {
                    return false;
                }
            }
            return true;
        }

        // Validate aggregated sentiment format
        if (isset($data['overall_sentiment']) && 
            $data['overall_sentiment'] >= 0 && 
            $data['overall_sentiment'] <= 100) {
            return true;
        }

        return false;
    }

    /**
     * Interpret sentiment value
     *
     * @param int $value
     * @return array
     */
    public function interpretSentiment(int $value): array
    {
        $classification = '';
        $description = '';
        
        if ($value <= 20) {
            $classification = 'extreme_fear';
            $description = 'Extreme fear in the market';
        } elseif ($value <= 40) {
            $classification = 'fear';
            $description = 'Fear in the market';
        } elseif ($value <= 60) {
            $classification = 'neutral';
            $description = 'Market sentiment is neutral';
        } elseif ($value <= 80) {
            $classification = 'greed';
            $description = 'Greed in the market';
        } else {
            $classification = 'extreme_greed';
            $description = 'Extreme greed in the market';
        }
        
        return [
            'value' => $value,
            'classification' => $classification,
            'description' => $description
        ];
    }
    
    /**
     * Get market sentiment data
     *
     * @return array
     */
    public function getMarketSentiment(): array
    {
        $this->logOperation('getMarketSentiment');
        
        if (!$this->cryptoCompareService) {
            return [
                'error' => 'CryptoCompare service not available',
                'sentiment_score' => 50,
                'bullish_percentage' => 0,
                'bearish_percentage' => 0,
                'neutral_percentage' => 100
            ];
        }
        
        try {
            return $this->cryptoCompareService->getMarketSentiment();
        } catch (\Exception $e) {
            Log::error('Failed to get market sentiment', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
    
    /**
     * Get market sentiment directly from API (for cache updates)
     *
     * @return array
     */
    public function getMarketSentimentDirect(): array
    {
        $this->logOperation('getMarketSentimentDirect');
        
        if (!$this->cryptoCompareService) {
            throw new \Exception('CryptoCompare service not available');
        }
        
        return $this->cryptoCompareService->getMarketSentimentDirect();
    }
    
    /**
     * Get social activity directly from API (for cache updates)
     *
     * @param int $days
     * @return array
     */
    public function getSocialActivityDirect(int $days = 30): array
    {
        $this->logOperation('getSocialActivityDirect', ['days' => $days]);
        
        if (!$this->cryptoCompareService) {
            throw new \Exception('CryptoCompare service not available');
        }
        
        return $this->cryptoCompareService->getSocialActivityDirect($days);
    }
    
    /**
     * Get Fear & Greed Index directly from API (for cache updates)
     *
     * @param int $limit
     * @return array
     */
    public function getFearGreedIndexDirect(int $limit = 30): array
    {
        $this->logOperation('getFearGreedIndexDirect', ['limit' => $limit]);
        
        return $this->alternativeService->getFearGreedIndexDirect($limit);
    }
    
    /**
     * Calculate sentiment score from price action
     */
    public function calculateSentimentFromPrice(array $data): int
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
    public function getSignalFromPrice(array $data): string
    {
        if (!isset($data['CHANGEPCT24HOUR'])) return 'neutral';
        
        $change = floatval($data['CHANGEPCT24HOUR']);
        if ($change > 2) return 'bullish';
        if ($change < -2) return 'bearish';
        return 'neutral';
    }
    
    /**
     * Calculate market-wide sentiment from top coins
     */
    public function calculateMarketSentimentFromCoins(array $coinData): array
    {
        if (empty($coinData)) {
            return [
                'sentiment_score' => 50,
                'overall_signal' => 'neutral',
                'bullish_percentage' => 0,
                'bearish_percentage' => 0,
                'neutral_percentage' => 100,
                'top_gainers' => [],
                'top_losers' => [],
                'timestamp' => now()->toIso8601String()
            ];
        }
        
        $bullishCount = 0;
        $bearishCount = 0;
        $neutralCount = 0;
        $totalScore = 0;
        $topGainers = [];
        $topLosers = [];
        
        foreach ($coinData as $coin) {
            // Calculate individual sentiment
            $sentiment = $this->calculateSentimentFromPrice($coin);
            $signal = $this->getSignalFromPrice($coin);
            
            $totalScore += $sentiment;
            
            // Count signals
            switch ($signal) {
                case 'bullish':
                    $bullishCount++;
                    if (isset($coin['CHANGEPCT24HOUR']) && $coin['CHANGEPCT24HOUR'] > 0) {
                        $topGainers[] = [
                            'symbol' => $coin['FROMSYMBOL'] ?? '',
                            'change' => round($coin['CHANGEPCT24HOUR'], 2)
                        ];
                    }
                    break;
                case 'bearish':
                    $bearishCount++;
                    if (isset($coin['CHANGEPCT24HOUR']) && $coin['CHANGEPCT24HOUR'] < 0) {
                        $topLosers[] = [
                            'symbol' => $coin['FROMSYMBOL'] ?? '',
                            'change' => round($coin['CHANGEPCT24HOUR'], 2)
                        ];
                    }
                    break;
                default:
                    $neutralCount++;
            }
        }
        
        $totalCoins = count($coinData);
        $avgSentiment = $totalCoins > 0 ? round($totalScore / $totalCoins) : 50;
        
        // Sort and limit gainers/losers
        usort($topGainers, fn($a, $b) => $b['change'] <=> $a['change']);
        usort($topLosers, fn($a, $b) => $a['change'] <=> $b['change']);
        
        $topGainers = array_slice($topGainers, 0, 5);
        $topLosers = array_slice($topLosers, 0, 5);
        
        // Determine overall signal
        $overallSignal = 'neutral';
        if ($avgSentiment >= 65) $overallSignal = 'bullish';
        elseif ($avgSentiment <= 35) $overallSignal = 'bearish';
        
        return [
            'sentiment_score' => $avgSentiment,
            'overall_signal' => $overallSignal,
            'bullish_percentage' => round(($bullishCount / $totalCoins) * 100),
            'bearish_percentage' => round(($bearishCount / $totalCoins) * 100),
            'neutral_percentage' => round(($neutralCount / $totalCoins) * 100),
            'top_gainers' => $topGainers,
            'top_losers' => $topLosers,
            'timestamp' => now()->toIso8601String()
        ];
    }
}