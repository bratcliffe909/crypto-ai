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
     * Check if Finnhub API is configured
     */
    public function isConfigured()
    {
        return !empty($this->apiKey);
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
            Log::info('Fetching economic calendar from Finnhub', [
                'from' => $from,
                'to' => $to,
                'url' => "{$this->baseUrl}/calendar/economic"
            ]);
            
            $response = Http::timeout(30)->get("{$this->baseUrl}/calendar/economic", [
                'from' => $from,
                'to' => $to,
                'token' => $this->apiKey
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                Log::info('Finnhub economic calendar response', [
                    'status' => $response->status(),
                    'hasData' => !empty($data),
                    'dataType' => gettype($data),
                    'hasEconomicCalendar' => isset($data['economicCalendar'])
                ]);
                
                // Map Finnhub format to our standard format
                $mappedEvents = [];
                $events = isset($data['economicCalendar']) ? $data['economicCalendar'] : $data;
                
                if (is_array($events)) {
                    foreach ($events as $event) {
                        $mappedEvents[] = $this->mapFinnhubEvent($event);
                    }
                }
                
                return $mappedEvents;
            }

            Log::error('Finnhub economic calendar request failed', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            
            throw new \Exception('Finnhub economic calendar request failed: ' . $response->status());
        });
    }

    /**
     * Map Finnhub event to standard format
     */
    private function mapFinnhubEvent($finnhubEvent)
    {
        // Map impact levels
        $impactMap = [
            '3' => 'high',
            '2' => 'medium',
            '1' => 'low',
            '0' => 'low'
        ];

        $impact = $impactMap[$finnhubEvent['impact'] ?? '0'] ?? 'medium';

        return [
            'event' => $finnhubEvent['event'] ?? 'Unknown Event',
            'date' => Carbon::createFromTimestamp($finnhubEvent['time'] ?? time())->format('Y-m-d'),
            'impact' => $impact,
            'country' => $finnhubEvent['country'] ?? 'Unknown',
            'description' => $finnhubEvent['event'] ?? '',
            'actual' => $finnhubEvent['actual'] ?? null,
            'estimate' => $finnhubEvent['estimate'] ?? null,
            'previous' => $finnhubEvent['prev'] ?? null,
            'unit' => $finnhubEvent['unit'] ?? '',
            'source' => 'Finnhub'
        ];
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