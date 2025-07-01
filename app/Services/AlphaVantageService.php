<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AlphaVantageService
{
    private $apiKey;
    private $baseUrl = 'https://www.alphavantage.co/query';
    private $cacheService;

    public function __construct(CacheService $cacheService)
    {
        $this->apiKey = config('services.alpha_vantage.key');
        $this->cacheService = $cacheService;
    }

    /**
     * Get technical indicator data
     */
    public function getTechnicalIndicator($function, $symbol, $interval = 'weekly', $timePeriod = 20, $seriesType = 'close')
    {
        $cacheKey = "av_{$function}_{$symbol}_{$interval}_{$timePeriod}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($function, $symbol, $interval, $timePeriod, $seriesType) {
            $params = [
                'function' => $function,
                'symbol' => $symbol,
                'interval' => $interval,
                'time_period' => $timePeriod,
                'series_type' => $seriesType,
                'apikey' => $this->apiKey
            ];

            $response = Http::timeout(30)->get($this->baseUrl, $params);

            if ($response->successful()) {
                $data = $response->json();
                
                // Check for error message
                if (isset($data['Error Message']) || isset($data['Note'])) {
                    Log::error('AlphaVantage API error', ['response' => $data]);
                    throw new \Exception($data['Error Message'] ?? $data['Note'] ?? 'API Error');
                }
                
                return $data;
            }

            throw new \Exception('AlphaVantage API request failed');
        });
    }

    /**
     * Get crypto rating
     */
    public function getCryptoRating($symbol)
    {
        $cacheKey = "av_crypto_rating_{$symbol}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($symbol) {
            $params = [
                'function' => 'CRYPTO_RATING',
                'symbol' => $symbol,
                'apikey' => $this->apiKey
            ];

            $response = Http::timeout(30)->get($this->baseUrl, $params);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Error Message']) || isset($data['Note'])) {
                    throw new \Exception($data['Error Message'] ?? $data['Note'] ?? 'API Error');
                }
                
                return $data;
            }

            throw new \Exception('AlphaVantage crypto rating request failed');
        });
    }

    /**
     * Get news sentiment
     */
    public function getNewsSentiment($tickers = null, $topics = null)
    {
        $cacheKey = "av_news_sentiment_" . md5(($tickers ?? '') . ($topics ?? ''));

        return $this->cacheService->remember($cacheKey, 60, function () use ($tickers, $topics) {
            $params = [
                'function' => 'NEWS_SENTIMENT',
                'apikey' => $this->apiKey
            ];

            if ($tickers) {
                $params['tickers'] = $tickers;
            }

            if ($topics) {
                $params['topics'] = $topics;
            }

            $response = Http::timeout(30)->get($this->baseUrl, $params);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Error Message']) || isset($data['Note'])) {
                    throw new \Exception($data['Error Message'] ?? $data['Note'] ?? 'API Error');
                }
                
                return $data;
            }

            throw new \Exception('AlphaVantage news sentiment request failed');
        });
    }

    /**
     * Get RSI data
     */
    public function getRSI($symbol, $interval = 'daily', $timePeriod = 14)
    {
        return $this->getTechnicalIndicator('RSI', $symbol, $interval, $timePeriod);
    }

    /**
     * Get MACD data
     */
    public function getMACD($symbol, $interval = 'daily')
    {
        $cacheKey = "av_macd_{$symbol}_{$interval}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($symbol, $interval) {
            $params = [
                'function' => 'MACD',
                'symbol' => $symbol,
                'interval' => $interval,
                'series_type' => 'close',
                'apikey' => $this->apiKey
            ];

            $response = Http::timeout(30)->get($this->baseUrl, $params);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Error Message']) || isset($data['Note'])) {
                    throw new \Exception($data['Error Message'] ?? $data['Note'] ?? 'API Error');
                }
                
                return $data;
            }

            throw new \Exception('AlphaVantage MACD request failed');
        });
    }

    /**
     * Get SMA data
     */
    public function getSMA($symbol, $interval = 'weekly', $timePeriod = 20)
    {
        return $this->getTechnicalIndicator('SMA', $symbol, $interval, $timePeriod);
    }

    /**
     * Get EMA data
     */
    public function getEMA($symbol, $interval = 'weekly', $timePeriod = 21)
    {
        return $this->getTechnicalIndicator('EMA', $symbol, $interval, $timePeriod);
    }

    /**
     * Get weekly digital currency data
     */
    public function getDigitalCurrencyWeekly($fromSymbol, $toMarket = 'USD')
    {
        $cacheKey = "av_digital_currency_weekly_{$fromSymbol}_{$toMarket}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($fromSymbol, $toMarket) {
            $params = [
                'function' => 'DIGITAL_CURRENCY_WEEKLY',
                'symbol' => $fromSymbol,
                'market' => $toMarket,
                'apikey' => $this->apiKey
            ];

            $response = Http::timeout(30)->get($this->baseUrl, $params);

            if ($response->successful()) {
                $data = $response->json();
                
                // Check for error message
                if (isset($data['Error Message']) || isset($data['Note'])) {
                    Log::error('AlphaVantage API error', ['response' => $data]);
                    throw new \Exception($data['Error Message'] ?? $data['Note'] ?? 'API Error');
                }
                
                return $data;
            }

            throw new \Exception('AlphaVantage digital currency weekly request failed');
        });
    }
    
    /**
     * Get cryptocurrency exchange rate
     */
    public function getCryptoExchangeRate($fromCurrency, $toCurrency = 'USD')
    {
        $cacheKey = "av_crypto_exchange_{$fromCurrency}_{$toCurrency}";
        
        return $this->cacheService->remember($cacheKey, 300, function () use ($fromCurrency, $toCurrency) {
            $params = [
                'function' => 'CURRENCY_EXCHANGE_RATE',
                'from_currency' => $fromCurrency,
                'to_currency' => $toCurrency,
                'apikey' => $this->apiKey
            ];
            
            $response = Http::timeout(30)->get($this->baseUrl, $params);
            
            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['Error Message']) || isset($data['Note'])) {
                    throw new \Exception($data['Error Message'] ?? $data['Note'] ?? 'API Error');
                }
                
                return $data;
            }
            
            throw new \Exception('AlphaVantage crypto exchange rate request failed');
        });
    }
}