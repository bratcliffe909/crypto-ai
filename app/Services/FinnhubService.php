<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class FinnhubService
{
    private $baseUrl;
    private $apiKey;
    private $cacheTime = 3600; // 1 hour for economic calendar

    public function __construct()
    {
        $this->apiKey = config('services.finnhub.key');
        $this->baseUrl = config('services.finnhub.base_url');
    }

    /**
     * Get economic calendar events
     */
    public function getEconomicCalendar($from = null, $to = null)
    {
        // Default to next 90 days (3 months) if no dates provided
        $fromDate = $from ?? Carbon::now()->format('Y-m-d');
        $toDate = $to ?? Carbon::now()->addDays(90)->format('Y-m-d');
        
        $cacheKey = "economic_calendar_{$fromDate}_{$toDate}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($fromDate, $toDate) {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/calendar/economic", [
                    'from' => $fromDate,
                    'to' => $toDate,
                    'token' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['economicCalendar'])) {
                        // Transform and filter the data
                        $events = collect($data['economicCalendar'])
                            ->map(function ($event) {
                                return [
                                    'date' => $event['time'] ?? null,
                                    'country' => $event['country'] ?? 'N/A',
                                    'event' => $event['event'] ?? 'Unknown Event',
                                    'impact' => $this->mapImpact($event['impact'] ?? 0),
                                    'actual' => $event['actual'] ?? null,
                                    'estimate' => $event['estimate'] ?? null,
                                    'previous' => $event['prev'] ?? null,
                                    'unit' => $event['unit'] ?? '',
                                    'source' => 'finnhub'
                                ];
                            })
                            ->filter(function ($event) {
                                // Focus on high-impact events and US events
                                return $event['impact'] !== 'low' && 
                                       ($event['country'] === 'US' || $event['impact'] === 'high');
                            })
                            ->values()
                            ->toArray();
                        
                        // Merge with static FOMC dates
                        $staticEvents = $this->getStaticFOMCDates($fromDate, $toDate);
                        $allEvents = array_merge($events, $staticEvents);
                        
                        // Sort by date
                        usort($allEvents, function ($a, $b) {
                            return strtotime($a['date']) - strtotime($b['date']);
                        });
                        
                        return $allEvents;
                    }
                    
                    // If no data from API, return static events
                    return $this->getStaticFOMCDates($fromDate, $toDate);
                }

                Log::error('Finnhub API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                // Return static events as fallback
                return $this->getStaticFOMCDates($fromDate, $toDate);
                
            } catch (\Exception $e) {
                Log::error('Finnhub Economic Calendar exception', ['error' => $e->getMessage()]);
                // Return static events as fallback
                return $this->getStaticFOMCDates($fromDate, $toDate);
            }
        });
    }
    
    /**
     * Get static FOMC dates for 2025
     */
    private function getStaticFOMCDates($from, $to)
    {
        $fomcDates = [
            ['date' => '2025-01-29', 'event' => 'FOMC Meeting Decision', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-03-19', 'event' => 'FOMC Meeting + Economic Projections', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-05-07', 'event' => 'FOMC Meeting Decision', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-06-18', 'event' => 'FOMC Meeting + Economic Projections', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-07-30', 'event' => 'FOMC Meeting Decision', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-09-17', 'event' => 'FOMC Meeting + Economic Projections', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-11-05', 'event' => 'FOMC Meeting Decision', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-12-17', 'event' => 'FOMC Meeting + Economic Projections', 'country' => 'US', 'impact' => 'high', 'source' => 'static']
        ];
        
        // Add crypto-specific events
        $cryptoEvents = [
            ['date' => '2025-06-30', 'event' => 'Q2 2025 Ends - Quarterly Reports', 'country' => 'Global', 'impact' => 'medium', 'source' => 'static'],
            ['date' => '2025-07-01', 'event' => 'Crypto Options Expiry', 'country' => 'Global', 'impact' => 'medium', 'source' => 'static'],
            ['date' => '2025-07-15', 'event' => 'US CPI Data Release', 'country' => 'US', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-08-01', 'event' => 'Monthly Crypto Options Expiry', 'country' => 'Global', 'impact' => 'medium', 'source' => 'static'],
            ['date' => '2025-08-15', 'event' => 'US Retail Sales Data', 'country' => 'US', 'impact' => 'medium', 'source' => 'static'],
            ['date' => '2025-09-01', 'event' => 'Labor Day - US Markets Closed', 'country' => 'US', 'impact' => 'low', 'source' => 'static'],
            ['date' => '2025-09-15', 'event' => 'Ethereum Pectra Upgrade (Tentative)', 'country' => 'Global', 'impact' => 'high', 'source' => 'static'],
            ['date' => '2025-09-30', 'event' => 'Q3 2025 Ends - Quarterly Reports', 'country' => 'Global', 'impact' => 'medium', 'source' => 'static'],
            ['date' => '2025-10-31', 'event' => 'Bitcoin Whitepaper Anniversary', 'country' => 'Global', 'impact' => 'low', 'source' => 'static'],
            ['date' => '2025-12-31', 'event' => 'Year End - Tax Considerations', 'country' => 'Global', 'impact' => 'medium', 'source' => 'static'],
            ['date' => '2028-04-01', 'event' => 'Bitcoin Halving (Estimated)', 'country' => 'Global', 'impact' => 'high', 'source' => 'static']
        ];
        
        $allEvents = array_merge($fomcDates, $cryptoEvents);
        
        // Filter by date range
        $filtered = array_filter($allEvents, function ($event) use ($from, $to) {
            $eventDate = $event['date'];
            return $eventDate >= $from && $eventDate <= $to;
        });
        
        return array_values($filtered);
    }
    
    /**
     * Map Finnhub impact levels to our impact scale
     */
    private function mapImpact($impact)
    {
        switch ($impact) {
            case 3:
                return 'high';
            case 2:
                return 'medium';
            case 1:
                return 'low';
            default:
                return 'low';
        }
    }
    
    /**
     * Get crypto news
     */
    public function getCryptoNews($category = 'crypto', $minId = 0)
    {
        $cacheKey = "crypto_news_{$category}_{$minId}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($category, $minId) {
            try {
                $response = Http::timeout(30)->get("{$this->baseUrl}/news", [
                    'category' => $category,
                    'minId' => $minId,
                    'token' => $this->apiKey
                ]);

                if ($response->successful()) {
                    $articles = $response->json();
                    
                    if (is_array($articles)) {
                        // Transform the news data
                        return array_map(function ($article) {
                            return [
                                'id' => $article['id'] ?? null,
                                'title' => $article['headline'] ?? '',
                                'url' => $article['url'] ?? '',
                                'summary' => $article['summary'] ?? '',
                                'source' => $article['source'] ?? 'Unknown',
                                'publishedAt' => isset($article['datetime']) ? 
                                    Carbon::createFromTimestamp($article['datetime'])->toIso8601String() : null,
                                'image' => $article['image'] ?? null,
                                'category' => $article['category'] ?? 'crypto',
                                'related' => $article['related'] ?? ''
                            ];
                        }, $articles);
                    }
                    
                    return [];
                }

                Log::error('Finnhub News API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return [];
                
            } catch (\Exception $e) {
                Log::error('Finnhub News API exception', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
}