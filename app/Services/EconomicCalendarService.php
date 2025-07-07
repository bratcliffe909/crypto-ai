<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EconomicCalendarService
{
    private $fredService;
    private $finnhubService;
    private $cacheService;

    public function __construct(
        FREDService $fredService = null,
        FinnhubService $finnhubService = null,
        CacheService $cacheService = null
    ) {
        $this->fredService = $fredService;
        $this->finnhubService = $finnhubService;
        $this->cacheService = $cacheService;
    }

    /**
     * Get upcoming economic events from all sources
     */
    public function getUpcomingEvents($days = 30)
    {
        $cacheKey = "economic_events_{$days}";
        
        if ($this->cacheService) {
            return $this->cacheService->remember($cacheKey, 720, function () use ($days) {
                return $this->fetchAllEvents($days);
            });
        }
        
        return $this->fetchAllEvents($days);
    }

    /**
     * Fetch events from all available sources
     */
    private function fetchAllEvents($days)
    {
        $events = [];
        $startDate = Carbon::now();
        $endDate = Carbon::now()->addDays($days);

        // 1. Get static FOMC dates
        $events = array_merge($events, $this->getStaticFOMCDates($startDate, $endDate));

        // 2. Get FRED API events if available
        if ($this->fredService && $this->fredService->isConfigured()) {
            try {
                $fredEvents = $this->getFREDEvents($startDate, $endDate);
                $events = array_merge($events, $fredEvents);
            } catch (\Exception $e) {
                Log::error('Failed to fetch FRED events', ['error' => $e->getMessage()]);
            }
        }

        // 3. Get Finnhub events if available
        if ($this->finnhubService && $this->finnhubService->isConfigured()) {
            try {
                $finnhubEvents = $this->getFinnhubEvents($startDate, $endDate);
                $events = array_merge($events, $finnhubEvents);
            } catch (\Exception $e) {
                Log::error('Failed to fetch Finnhub events', ['error' => $e->getMessage()]);
            }
        }

        // 4. Add static crypto events
        $events = array_merge($events, $this->getStaticCryptoEvents($startDate, $endDate));

        // Process and deduplicate events
        return $this->processEvents($events);
    }

    /**
     * Get static FOMC dates from config
     */
    private function getStaticFOMCDates($startDate, $endDate)
    {
        // Get both 2024 and 2025 FOMC dates
        $fomc2024 = config('economic-events.fomc_2024', []);
        $fomc2025 = config('economic-events.fomc_2025', []);
        $fomcDates = array_merge($fomc2024, $fomc2025);
        
        $events = [];

        foreach ($fomcDates as $fomc) {
            $eventDate = Carbon::parse($fomc['date']);
            
            if ($eventDate->between($startDate, $endDate)) {
                $events[] = $fomc;
            }
        }

        return $events;
    }

    /**
     * Get events from FRED API
     */
    private function getFREDEvents($startDate, $endDate)
    {
        if (!$this->fredService) {
            return [];
        }

        $releaseDates = $this->fredService->getReleasesDates(
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        );

        return $this->fredService->mapToEconomicEvents($releaseDates);
    }

    /**
     * Get events from Finnhub API
     */
    private function getFinnhubEvents($startDate, $endDate)
    {
        if (!$this->finnhubService) {
            return [];
        }

        return $this->finnhubService->getEconomicCalendar(
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        );
    }

    /**
     * Get static crypto events from config
     */
    private function getStaticCryptoEvents($startDate, $endDate)
    {
        $cryptoEvents = config('economic-events.crypto_events_2025', []);
        $events = [];

        foreach ($cryptoEvents as $event) {
            // Handle approximate dates (Q1, Q2, etc.)
            if (strpos($event['date'], 'Q') !== false) {
                // For now, skip quarterly estimates
                continue;
            }

            $eventDate = Carbon::parse($event['date']);
            
            if ($eventDate->between($startDate, $endDate)) {
                $events[] = $event;
            }
        }

        return $events;
    }

    /**
     * Process, deduplicate and sort events
     */
    private function processEvents($events)
    {
        // Remove duplicates based on event name and date
        $uniqueEvents = [];
        $seen = [];

        foreach ($events as $event) {
            $key = $event['event'] . '_' . $event['date'];
            
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $uniqueEvents[] = $event;
            }
        }

        // Sort by date
        usort($uniqueEvents, function ($a, $b) {
            return Carbon::parse($a['date'])->timestamp - Carbon::parse($b['date'])->timestamp;
        });

        // Add relative time information
        foreach ($uniqueEvents as &$event) {
            $eventDate = Carbon::parse($event['date']);
            $event['days_until'] = Carbon::now()->diffInDays($eventDate, false);
            $event['relative_time'] = $eventDate->diffForHumans();
        }

        return $uniqueEvents;
    }

    /**
     * Get major recurring economic events (legacy method)
     */
    public function getMajorEconomicEvents()
    {
        return $this->getUpcomingEvents(30);
    }

    /**
     * Get events for a specific date range (used by controller)
     */
    public function getEvents($from, $to)
    {
        // Handle null dates
        if (!$from || !$to) {
            return [
                'data' => [],
                'metadata' => [
                    'source' => 'none',
                    'lastUpdated' => now()->toIso8601String(),
                    'cacheAge' => 0,
                    'error' => 'Invalid date range'
                ]
            ];
        }
        
        // Convert dates to Carbon if they're strings
        $startDate = is_string($from) ? Carbon::parse($from) : $from;
        $endDate = is_string($to) ? Carbon::parse($to) : $to;
        
        // Calculate days between dates
        $days = $startDate->diffInDays($endDate);
        
        $cacheKey = "economic_calendar_{$from}_{$to}";
        
        // Use cacheService wrapper format for consistency
        return $this->cacheService->remember($cacheKey, 3600, function () use ($startDate, $endDate, $days) {
            $events = [];
            $source = 'none';
            
            // Try FRED first if configured
            if ($this->fredService && $this->fredService->isConfigured()) {
                try {
                    $fredEvents = $this->getFREDEvents($startDate, $endDate);
                    if (!empty($fredEvents)) {
                        $events = $fredEvents;
                        $source = 'FRED';
                    }
                } catch (\Exception $e) {
                    Log::warning('FRED API failed in getEvents', ['error' => $e->getMessage()]);
                }
            }
            
            // Try Finnhub as fallback if no FRED events
            if (empty($events) && $this->finnhubService && $this->finnhubService->isConfigured()) {
                try {
                    $finnhubResult = $this->finnhubService->getEconomicCalendar(
                        $startDate->format('Y-m-d'),
                        $endDate->format('Y-m-d')
                    );
                    
                    if (!empty($finnhubResult['data'])) {
                        $events = $finnhubResult['data'];
                        $source = 'Finnhub';
                    }
                } catch (\Exception $e) {
                    Log::warning('Finnhub API failed in getEvents', ['error' => $e->getMessage()]);
                }
            }
            
            // If still no events, use static data
            if (empty($events)) {
                $events = array_merge(
                    $this->getStaticFOMCDates($startDate, $endDate),
                    $this->getStaticCryptoEvents($startDate, $endDate)
                );
                $source = 'static';
            }
            
            // Process events (deduplicate, sort, etc.)
            $processedEvents = $this->processEvents($events);
            
            return [
                'data' => $processedEvents,
                'metadata' => [
                    'source' => $source,
                    'lastUpdated' => now()->toIso8601String(),
                    'cacheAge' => 0
                ]
            ];
        });
    }
    
    /**
     * Fetch from Trading Economics API (if you want to implement)
     * Requires API key from https://tradingeconomics.com/api
     */
    public function fetchFromTradingEconomics($country = 'united states', $importance = 3)
    {
        // This would require a Trading Economics API key
        // Free tier: 1,000 requests/month
        $apiKey = config('services.trading_economics.key');
        
        if (!$apiKey) {
            return [];
        }
        
        try {
            $response = Http::timeout(10)->get('https://api.tradingeconomics.com/calendar/country/' . $country, [
                'c' => $apiKey,
                'importance' => $importance
            ]);
            
            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            Log::error('Trading Economics API error', ['error' => $e->getMessage()]);
        }
        
        return [];
    }
}