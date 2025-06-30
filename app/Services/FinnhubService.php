<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class FinnhubService
{
    private $apiKey;
    private $baseUrl = 'https://finnhub.io/api/v1';
    private $cacheService;

    public function __construct(CacheService $cacheService)
    {
        $this->apiKey = config('services.finnhub.key');
        $this->cacheService = $cacheService;
    }

    /**
     * Get economic calendar events
     */
    public function getEconomicCalendar($from = null, $to = null)
    {
        if (!$from) {
            $from = Carbon::now()->startOfMonth()->format('Y-m-d');
        }
        
        if (!$to) {
            $to = Carbon::now()->endOfMonth()->format('Y-m-d');
        }

        $cacheKey = "finnhub_economic_calendar_{$from}_{$to}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($from, $to) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/calendar/economic", [
                'from' => $from,
                'to' => $to,
                'token' => $this->apiKey
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['economicCalendar'])) {
                    return $data['economicCalendar'];
                }
                
                return $data;
            }

            throw new \Exception('Finnhub economic calendar request failed');
        });
    }

    /**
     * Get crypto candles
     */
    public function getCryptoCandles($symbol, $resolution, $from, $to)
    {
        $cacheKey = "finnhub_crypto_candles_{$symbol}_{$resolution}_{$from}_{$to}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($symbol, $resolution, $from, $to) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/crypto/candle", [
                'symbol' => $symbol,
                'resolution' => $resolution,
                'from' => $from,
                'to' => $to,
                'token' => $this->apiKey
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Finnhub crypto candles request failed');
        });
    }

    /**
     * Get market news
     */
    public function getMarketNews($category = 'crypto')
    {
        $cacheKey = "finnhub_market_news_{$category}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($category) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/news", [
                'category' => $category,
                'token' => $this->apiKey
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Finnhub market news request failed');
        });
    }

    /**
     * Get crypto exchanges
     */
    public function getCryptoExchanges()
    {
        $cacheKey = "finnhub_crypto_exchanges";

        return $this->cacheService->remember($cacheKey, 60, function () {
            $response = Http::timeout(30)->get("{$this->baseUrl}/crypto/exchange", [
                'token' => $this->apiKey
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Finnhub crypto exchanges request failed');
        });
    }

    /**
     * Get crypto symbols
     */
    public function getCryptoSymbols($exchange)
    {
        $cacheKey = "finnhub_crypto_symbols_{$exchange}";

        return $this->cacheService->remember($cacheKey, 60, function () use ($exchange) {
            $response = Http::timeout(30)->get("{$this->baseUrl}/crypto/symbol", [
                'exchange' => $exchange,
                'token' => $this->apiKey
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Finnhub crypto symbols request failed');
        });
    }
}