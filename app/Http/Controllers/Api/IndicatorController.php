<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlphaVantageService;
use App\Services\CoinGeckoService;
use App\Services\AlternativeService;
use App\Services\FinnhubService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class IndicatorController extends Controller
{
    protected $alphaVantage;
    protected $coinGecko;
    protected $alternative;
    protected $finnhub;

    public function __construct(AlphaVantageService $alphaVantage, CoinGeckoService $coinGecko, AlternativeService $alternative, FinnhubService $finnhub)
    {
        $this->alphaVantage = $alphaVantage;
        $this->coinGecko = $coinGecko;
        $this->alternative = $alternative;
        $this->finnhub = $finnhub;
    }

    /**
     * Get technical indicators for a cryptocurrency
     */
    public function getIndicators(Request $request, $symbol)
    {
        try {
            // Default to Bitcoin if no symbol provided
            $cryptoSymbol = strtoupper($symbol) ?: 'BTC';
            
            // For Alpha Vantage, we need the full symbol (e.g., BTCUSD)
            $avSymbol = $cryptoSymbol . 'USD';
            
            // Get current price from CoinGecko
            $coinId = $this->mapSymbolToCoinId($cryptoSymbol);
            $priceResult = $this->coinGecko->getSimplePrice($coinId, 'usd');
            $priceData = $priceResult['data'] ?? [];
            $currentData = [
                'price' => $priceData[$coinId]['usd'] ?? null,
                'price_change_percentage_24h' => $priceData[$coinId]['usd_24h_change'] ?? null
            ];
            
            // Get technical indicators from Alpha Vantage
            $rsiResult = $this->alphaVantage->getRSI($avSymbol, 'daily', 14);
            $macdResult = $this->alphaVantage->getMACD($avSymbol, 'daily');
            
            // Extract data from cache service wrapper
            $rsiData = $rsiResult['data'] ?? [];
            $macdData = $macdResult['data'] ?? [];
            
            // If Alpha Vantage fails, try to calculate locally from price history
            if (empty($rsiData) || !isset($rsiData['Technical Analysis: RSI'])) {
                // Get historical prices from CoinGecko for calculation
                $chartResult = $this->coinGecko->getMarketChart($coinId, 'usd', 30);
                $historicalPrices = $chartResult['data'] ?? [];
                
                if (!empty($historicalPrices['prices'])) {
                    $rsiData = $this->calculateRSIFromPrices($historicalPrices['prices'], 14);
                }
            }
            
            // Process RSI data
            $rsi = null;
            if (isset($rsiData['Technical Analysis: RSI'])) {
                $rsiValues = $rsiData['Technical Analysis: RSI'];
                $latestDate = array_key_first($rsiValues);
                $rsi = [
                    'value' => round(floatval($rsiValues[$latestDate]['RSI']), 2),
                    'date' => $latestDate,
                    'interpretation' => $this->interpretRSI(floatval($rsiValues[$latestDate]['RSI']))
                ];
            }
            
            // Process MACD data
            $macd = null;
            if (isset($macdData['Technical Analysis: MACD'])) {
                $macdValues = $macdData['Technical Analysis: MACD'];
                $latestDate = array_key_first($macdValues);
                $macd = [
                    'macd' => round(floatval($macdValues[$latestDate]['MACD']), 4),
                    'signal' => round(floatval($macdValues[$latestDate]['MACD_Signal']), 4),
                    'histogram' => round(floatval($macdValues[$latestDate]['MACD_Hist']), 4),
                    'date' => $latestDate,
                    'interpretation' => $this->interpretMACD(
                        floatval($macdValues[$latestDate]['MACD']),
                        floatval($macdValues[$latestDate]['MACD_Signal'])
                    )
                ];
            }
            
            // Get historical data for charts
            $rsiHistory = [];
            if (isset($rsiData['Technical Analysis: RSI'])) {
                $count = 0;
                foreach ($rsiData['Technical Analysis: RSI'] as $date => $value) {
                    if ($count >= 30) break; // Last 30 days
                    $rsiHistory[] = [
                        'date' => $date,
                        'value' => round(floatval($value['RSI']), 2)
                    ];
                    $count++;
                }
                $rsiHistory = array_reverse($rsiHistory);
            }
            
            $macdHistory = [];
            if (isset($macdData['Technical Analysis: MACD'])) {
                $count = 0;
                foreach ($macdData['Technical Analysis: MACD'] as $date => $value) {
                    if ($count >= 30) break; // Last 30 days
                    $macdHistory[] = [
                        'date' => $date,
                        'macd' => round(floatval($value['MACD']), 4),
                        'signal' => round(floatval($value['MACD_Signal']), 4),
                        'histogram' => round(floatval($value['MACD_Hist']), 4)
                    ];
                    $count++;
                }
                $macdHistory = array_reverse($macdHistory);
            }
            
            return response()->json([
                'symbol' => $cryptoSymbol,
                'coinId' => $coinId,
                'currentPrice' => $currentData['price'] ?? null,
                'priceChange24h' => $currentData['price_change_percentage_24h'] ?? null,
                'indicators' => [
                    'rsi' => $rsi,
                    'macd' => $macd
                ],
                'history' => [
                    'rsi' => $rsiHistory,
                    'macd' => $macdHistory
                ],
                'lastUpdated' => now()->toIso8601String()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Technical indicators error', ['error' => $e->getMessage()]);
            
            // Return a structured response even on error
            return response()->json([
                'symbol' => $cryptoSymbol ?? 'BTC',
                'coinId' => $coinId ?? 'bitcoin',
                'currentPrice' => null,
                'priceChange24h' => null,
                'indicators' => [
                    'rsi' => null,
                    'macd' => null
                ],
                'history' => [
                    'rsi' => [],
                    'macd' => []
                ],
                'error' => 'Rate limit exceeded. Technical indicators are temporarily unavailable.',
                'lastUpdated' => now()->toIso8601String()
            ], 200); // Return 200 with error message instead of 500
        }
    }
    
    /**
     * Map crypto symbol to CoinGecko ID
     */
    private function mapSymbolToCoinId($symbol)
    {
        $mapping = [
            'BTC' => 'bitcoin',
            'ETH' => 'ethereum',
            'BNB' => 'binancecoin',
            'SOL' => 'solana',
            'XRP' => 'ripple',
            'ADA' => 'cardano',
            'AVAX' => 'avalanche-2',
            'DOT' => 'polkadot',
            'MATIC' => 'matic-network',
            'LINK' => 'chainlink'
        ];
        
        return $mapping[$symbol] ?? 'bitcoin';
    }
    
    /**
     * Interpret RSI value
     */
    private function interpretRSI($value)
    {
        if ($value >= 70) {
            return ['status' => 'overbought', 'signal' => 'Strong Sell', 'description' => 'Asset may be overvalued'];
        } elseif ($value >= 60) {
            return ['status' => 'slightly_overbought', 'signal' => 'Sell', 'description' => 'Consider taking profits'];
        } elseif ($value >= 40 && $value <= 60) {
            return ['status' => 'neutral', 'signal' => 'Neutral', 'description' => 'No clear direction'];
        } elseif ($value >= 30) {
            return ['status' => 'slightly_oversold', 'signal' => 'Buy', 'description' => 'Potential buying opportunity'];
        } else {
            return ['status' => 'oversold', 'signal' => 'Strong Buy', 'description' => 'Asset may be undervalued'];
        }
    }
    
    /**
     * Interpret MACD values
     */
    private function interpretMACD($macd, $signal)
    {
        $difference = $macd - $signal;
        
        if ($difference > 0 && abs($difference) > 0.001) {
            return ['status' => 'bullish', 'signal' => 'Buy', 'description' => 'MACD above signal line'];
        } elseif ($difference < 0 && abs($difference) > 0.001) {
            return ['status' => 'bearish', 'signal' => 'Sell', 'description' => 'MACD below signal line'];
        } else {
            return ['status' => 'neutral', 'signal' => 'Hold', 'description' => 'MACD near signal line'];
        }
    }
    
    /**
     * Get Fear and Greed Index
     */
    public function fearGreed()
    {
        try {
            $result = $this->alternative->getFearGreedIndex(1);
            
            if (empty($result['data'])) {
                return response()->json([
                    'error' => 'No data available',
                    'lastUpdated' => $result['metadata']['lastUpdated'] ?? now()->toIso8601String(),
                    'cacheAge' => $result['metadata']['cacheAge'] ?? 0,
                    'dataSource' => $result['metadata']['source'] ?? 'none'
                ], 200);
            }
            
            // Return in the format expected by the frontend
            return response()->json([
                'data' => $result['data']
            ])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
            
        } catch (\Exception $e) {
            Log::error('Fear and Greed Index error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to fetch Fear and Greed Index',
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'none'
            ], 200);
        }
    }
    
    /**
     * Get Economic Calendar events
     */
    public function economicCalendar(Request $request)
    {
        try {
            $from = $request->get('from');
            $to = $request->get('to');
            
            $result = $this->finnhub->getEconomicCalendar($from, $to);
            
            // Extract the actual events data from the cache service wrapper
            $events = $result['data'] ?? [];
            
            // If it's still wrapped in economicCalendar key
            if (isset($events['economicCalendar'])) {
                $events = $events['economicCalendar'];
            }
            
            // Ensure events is an array
            if (!is_array($events)) {
                $events = [];
            }
            
            // If we have no events, log it but don't throw exception
            if (empty($events)) {
                Log::warning('Economic Calendar returned no events', [
                    'from' => $from,
                    'to' => $to,
                    'metadata' => $result['metadata'] ?? []
                ]);
            }
            
            // Process events to add flag URLs - this needs to happen ALWAYS
            // whether data comes from cache or fresh API call
            $events = $this->processEventsWithFlags($events);
            
            return response()->json([
                'events' => $events,
                'count' => count($events),
                'lastUpdated' => $result['metadata']['lastUpdated'] ?? now()->toIso8601String(),
                'cacheAge' => $result['metadata']['cacheAge'] ?? 0,
                'dataSource' => $result['metadata']['source'] ?? 'unknown'
            ])
            ->header('X-Cache-Age', $result['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $result['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $result['metadata']['lastUpdated'] ?? now()->toIso8601String());
            
        } catch (\Exception $e) {
            Log::error('Economic Calendar error', [
                'error' => $e->getMessage(),
                'from' => $from ?? 'not set',
                'to' => $to ?? 'not set'
            ]);
            
            // Return empty events array instead of sample data
            // This prevents the shifting dates issue
            $sampleEvents = [];
            
            return response()->json([
                'events' => $sampleEvents,
                'count' => 0,
                'error' => 'Economic calendar data temporarily unavailable. Please check API configuration.',
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'dataSource' => 'sample'
            ], 200);
        }
    }
    
    /**
     * Get crypto news feed
     */
    public function newsFeed(Request $request)
    {
        try {
            // Get pagination parameters
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 20);
            $offset = ($page - 1) * $perPage;
            
            // Get news from Finnhub (AlphaVantage often rate limited)
            $finnhubResult = $this->finnhub->getMarketNews('crypto');
            
            // Handle the cache service response format
            $finnhubNews = $finnhubResult['data'] ?? [];
            
            // Normalize Finnhub news format
            $normalizedNews = array_map(function($article) {
                return [
                    'title' => $article['headline'] ?? '',
                    'summary' => $article['summary'] ?? '',
                    'url' => $article['url'] ?? '',
                    'source' => $article['source'] ?? 'Unknown',
                    'publishedAt' => isset($article['datetime']) ? date('Y-m-d H:i:s', $article['datetime']) : now()->toDateTimeString(),
                    'image' => $article['image'] ?? null,
                    'category' => $article['category'] ?? 'crypto'
                ];
            }, $finnhubNews);
            
            // Sort by published date (newest first)
            usort($normalizedNews, function ($a, $b) {
                $aTime = strtotime($a['publishedAt']);
                $bTime = strtotime($b['publishedAt']);
                return $bTime - $aTime;
            });
            
            // Apply pagination
            $totalArticles = count($normalizedNews);
            $paginatedNews = array_slice($normalizedNews, $offset, $perPage);
            
            return response()->json([
                'articles' => $paginatedNews,
                'count' => count($paginatedNews),
                'total' => $totalArticles,
                'page' => $page,
                'per_page' => $perPage,
                'has_more' => ($offset + $perPage) < $totalArticles,
                'lastUpdated' => now()->toIso8601String()
            ])
            ->header('X-Cache-Age', $finnhubResult['metadata']['cacheAge'] ?? 0)
            ->header('X-Data-Source', $finnhubResult['metadata']['source'] ?? 'unknown')
            ->header('X-Last-Updated', $finnhubResult['metadata']['lastUpdated'] ?? now()->toIso8601String());
            
        } catch (\Exception $e) {
            Log::error('News Feed error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch news feed'], 500);
        }
    }
    
    /**
     * Calculate RSI from price data
     */
    private function calculateRSIFromPrices($prices, $period = 14)
    {
        if (count($prices) < $period + 1) {
            return [];
        }
        
        // Extract just the prices (CoinGecko returns [timestamp, price])
        $priceValues = array_map(function($item) {
            return $item[1];
        }, $prices);
        
        // Calculate price changes
        $changes = [];
        for ($i = 1; $i < count($priceValues); $i++) {
            $changes[] = $priceValues[$i] - $priceValues[$i - 1];
        }
        
        // Calculate RSI values
        $rsiValues = [];
        $gains = [];
        $losses = [];
        
        // Initial average gain/loss
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
        
        // Calculate RSI for each period
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
        
        // Return in Alpha Vantage format
        return ['Technical Analysis: RSI' => array_slice($rsiValues, -30, null, true)];
    }
    
    /**
     * Process events to add flag URLs from API
     */
    private function processEventsWithFlags($events)
    {
        $countryMap = [
            'US' => 'US',
            'EU' => 'DE', // Use German flag for EU
            'GB' => 'GB',
            'UK' => 'GB',
            'JP' => 'JP',
            'CN' => 'CN',
            'CA' => 'CA',
            'AU' => 'AU',
            'FR' => 'FR',
            'IT' => 'IT',
            'ES' => 'ES',
            'CH' => 'CH',
            'SE' => 'SE',
            'NO' => 'NO',
            'DK' => 'DK',
            'NZ' => 'NZ',
            'IN' => 'IN',
            'BR' => 'BR',
            'MX' => 'MX',
            'RU' => 'RU',
            'KR' => 'KR',
            'SG' => 'SG',
            'HK' => 'HK',
            'TW' => 'TW',
            'ZA' => 'ZA'
        ];
        
        // Cache for flag URLs during this request
        $flagCache = [];
        
        foreach ($events as &$event) {
            if (isset($event['country'])) {
                $isoCode = $countryMap[$event['country']] ?? $event['country'];
                // Convert to uppercase if it's already an ISO code
                if (strlen($isoCode) == 2) {
                    $isoCode = strtoupper($isoCode);
                }
                
                // Check if we already fetched this flag in this request
                if (!isset($flagCache[$isoCode])) {
                    $flagCache[$isoCode] = $this->getFlagUrl($isoCode);
                }
                
                $event['flagUrl'] = $flagCache[$isoCode];
            }
        }
        
        return $events;
    }
    
    /**
     * Get flag URL from API
     */
    private function getFlagUrl($isoCode)
    {
        // Validate ISO code
        if (!$isoCode || strlen($isoCode) != 2) {
            $isoCode = 'UN'; // United Nations flag as fallback
        }
        
        // Return direct URL to flagsapi.com
        return "https://flagsapi.com/{$isoCode}/flat/32.png";
    }
}