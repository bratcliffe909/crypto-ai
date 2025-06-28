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
            $priceData = $this->coinGecko->getSimplePrice($coinId, 'usd');
            $currentData = [
                'price' => $priceData[$coinId]['usd'] ?? null,
                'price_change_percentage_24h' => $priceData[$coinId]['usd_24h_change'] ?? null
            ];
            
            // Get technical indicators from Alpha Vantage
            $rsiData = $this->alphaVantage->getRSI($avSymbol, 'daily', 14);
            $macdData = $this->alphaVantage->getMACD($avSymbol, 'daily');
            
            // If Alpha Vantage fails, try to calculate locally from price history
            if (empty($rsiData) || !isset($rsiData['Technical Analysis: RSI'])) {
                // Get historical prices from CoinGecko for calculation
                $historicalPrices = $this->coinGecko->getMarketChart($coinId, 'usd', 30);
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
            $data = $this->alternative->getFearGreedIndex(1);
            
            if (empty($data)) {
                return response()->json(['error' => 'No data available'], 503);
            }
            
            // Return in the format expected by the frontend
            return response()->json([
                'data' => $data
            ]);
            
        } catch (\Exception $e) {
            Log::error('Fear and Greed Index error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch Fear and Greed Index'], 500);
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
            
            $events = $this->finnhub->getEconomicCalendar($from, $to);
            
            return response()->json([
                'events' => $events,
                'count' => count($events),
                'lastUpdated' => now()->toIso8601String()
            ]);
            
        } catch (\Exception $e) {
            Log::error('Economic Calendar error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch economic calendar'], 500);
        }
    }
    
    /**
     * Get crypto news feed
     */
    public function newsFeed(Request $request)
    {
        try {
            // Get news from both sources
            $alphaVantageNews = $this->alphaVantage->getNewsSentiment('CRYPTO:BTC,CRYPTO:ETH', 'blockchain,cryptocurrency', null, 20);
            $finnhubNews = $this->finnhub->getCryptoNews('crypto', 0);
            
            // Merge and sort by published date
            $allNews = array_merge($alphaVantageNews, $finnhubNews);
            
            // Sort by published date (newest first)
            usort($allNews, function ($a, $b) {
                $aTime = strtotime($a['publishedAt'] ?? '0');
                $bTime = strtotime($b['publishedAt'] ?? '0');
                return $bTime - $aTime;
            });
            
            // Limit to 30 articles and remove duplicates based on title similarity
            $uniqueNews = [];
            $seenTitles = [];
            
            foreach ($allNews as $article) {
                $title = strtolower($article['title']);
                $isDuplicate = false;
                
                foreach ($seenTitles as $seenTitle) {
                    similar_text($title, $seenTitle, $percent);
                    if ($percent > 80) {
                        $isDuplicate = true;
                        break;
                    }
                }
                
                if (!$isDuplicate && count($uniqueNews) < 30) {
                    $uniqueNews[] = $article;
                    $seenTitles[] = $title;
                }
            }
            
            return response()->json([
                'articles' => $uniqueNews,
                'count' => count($uniqueNews),
                'lastUpdated' => now()->toIso8601String()
            ]);
            
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
}