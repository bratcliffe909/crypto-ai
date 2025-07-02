<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class ChartAnnotationService
{
    protected $finnhubService;
    protected $cacheService;
    
    public function __construct(FinnhubService $finnhubService, CacheService $cacheService)
    {
        $this->finnhubService = $finnhubService;
        $this->cacheService = $cacheService;
    }
    
    /**
     * Get economic events formatted for chart annotations
     * 
     * @param string $startDate Start date in Y-m-d format
     * @param string $endDate End date in Y-m-d format
     * @param string $timeframe Chart timeframe (daily, weekly, monthly)
     * @return array
     */
    public function getChartAnnotations(string $startDate, string $endDate, string $timeframe = 'daily'): array
    {
        $cacheKey = "chart_annotations_{$startDate}_{$endDate}_{$timeframe}";
        
        return $this->cacheService->remember($cacheKey, 3600, function () use ($startDate, $endDate, $timeframe) {
            // Get economic events from Finnhub
            $events = $this->finnhubService->getEconomicCalendar($startDate, $endDate);
            
            if (empty($events)) {
                return $this->getHardcodedEvents($startDate, $endDate);
            }
            
            // Filter and format events for chart annotations
            return $this->formatEventsForChart($events, $timeframe);
        });
    }
    
    /**
     * Format economic events for chart display
     * 
     * @param array $events
     * @param string $timeframe
     * @return array
     */
    protected function formatEventsForChart(array $events, string $timeframe): array
    {
        $annotations = [];
        
        // Group events by date for weekly/monthly timeframes
        $groupedEvents = collect($events)->groupBy(function ($event) use ($timeframe) {
            $date = Carbon::parse($event['date']);
            
            switch ($timeframe) {
                case 'weekly':
                    return $date->startOfWeek()->format('Y-m-d');
                case 'monthly':
                    return $date->startOfMonth()->format('Y-m-d');
                default:
                    return $date->format('Y-m-d');
            }
        });
        
        foreach ($groupedEvents as $date => $dateEvents) {
            // Get the highest impact event for the period
            $highestImpactEvent = $dateEvents->sortByDesc('impact')->first();
            
            $annotation = [
                'date' => $date,
                'x' => strtotime($date) * 1000, // JavaScript timestamp
                'events' => $dateEvents->map(function ($event) {
                    return [
                        'event' => $event['event'] ?? 'Economic Event',
                        'country' => $event['country'] ?? 'US',
                        'impact' => $this->mapImpactLevel($event['impact'] ?? 0),
                        'actual' => $event['actual'] ?? null,
                        'forecast' => $event['forecast'] ?? null,
                        'previous' => $event['previous'] ?? null,
                    ];
                })->toArray(),
                'primaryEvent' => $highestImpactEvent['event'] ?? 'Economic Event',
                'impact' => $this->mapImpactLevel($highestImpactEvent['impact'] ?? 0),
                'color' => $this->getImpactColor($highestImpactEvent['impact'] ?? 0),
            ];
            
            $annotations[] = $annotation;
        }
        
        return $annotations;
    }
    
    /**
     * Map numeric impact to string level
     * 
     * @param int $impact
     * @return string
     */
    protected function mapImpactLevel($impact): string
    {
        if ($impact >= 3) {
            return 'high';
        } elseif ($impact >= 2) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    /**
     * Get color for impact level
     * 
     * @param int $impact
     * @return string
     */
    protected function getImpactColor($impact): string
    {
        if ($impact >= 3) {
            return '#dc3545'; // Red for high impact
        } elseif ($impact >= 2) {
            return '#ffc107'; // Yellow for medium impact
        } else {
            return '#6c757d'; // Gray for low impact
        }
    }
    
    /**
     * Get hardcoded events for demo/fallback
     * 
     * @param string $startDate
     * @param string $endDate
     * @return array
     */
    protected function getHardcodedEvents(string $startDate, string $endDate): array
    {
        $events = [
            // 2025 FOMC Meetings
            ['date' => '2025-01-29', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-03-19', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-05-07', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-06-18', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-07-30', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-09-17', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-11-05', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-12-17', 'event' => 'FOMC Meeting', 'country' => 'US', 'impact' => 3],
            
            // Monthly CPI releases (usually around 13th of each month)
            ['date' => '2025-01-14', 'event' => 'CPI Release', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-02-12', 'event' => 'CPI Release', 'country' => 'US', 'impact' => 3],
            ['date' => '2025-03-11', 'event' => 'CPI Release', 'country' => 'US', 'impact' => 3],
            
            // Bitcoin Halving (estimated)
            ['date' => '2028-04-15', 'event' => 'Bitcoin Halving', 'country' => 'Global', 'impact' => 3],
        ];
        
        // Filter events by date range
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
        // Filter and format events directly without calling formatEventsForChart
        return collect($events)
            ->filter(function ($event) use ($start, $end) {
                $eventDate = Carbon::parse($event['date']);
                return $eventDate->between($start, $end);
            })
            ->map(function ($event) {
                return [
                    'date' => $event['date'],
                    'x' => strtotime($event['date']) * 1000,
                    'events' => [[
                        'event' => $event['event'],
                        'country' => $event['country'],
                        'impact' => $this->mapImpactLevel($event['impact']),
                        'actual' => null,
                        'forecast' => null,
                        'previous' => null,
                    ]],
                    'primaryEvent' => $event['event'],
                    'impact' => $this->mapImpactLevel($event['impact']),
                    'color' => $this->getImpactColor($event['impact']),
                ];
            })
            ->values()
            ->toArray();
    }
}