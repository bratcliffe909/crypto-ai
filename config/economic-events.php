<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Static Economic Events
    |--------------------------------------------------------------------------
    |
    | These are known economic events that are scheduled in advance.
    | They serve as a reliable fallback when APIs are unavailable.
    |
    */

    'fomc_2024' => [
        [
            'event' => 'FOMC Meeting',
            'date' => '2024-12-17',
            'end_date' => '2024-12-18',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Federal Open Market Committee meeting - interest rate decision',
            'source' => 'Federal Reserve'
        ],
    ],
    
    'fomc_2025' => [
        [
            'event' => 'FOMC Meeting',
            'date' => '2025-01-28',
            'end_date' => '2025-01-29',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Federal Open Market Committee meeting - interest rate decision',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting + SEP',
            'date' => '2025-03-18',
            'end_date' => '2025-03-19',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'FOMC meeting with Summary of Economic Projections',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting',
            'date' => '2025-05-06',
            'end_date' => '2025-05-07',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Federal Open Market Committee meeting - interest rate decision',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting + SEP',
            'date' => '2025-06-17',
            'end_date' => '2025-06-18',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'FOMC meeting with Summary of Economic Projections',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting',
            'date' => '2025-07-29',
            'end_date' => '2025-07-30',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Federal Open Market Committee meeting - interest rate decision',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting + SEP',
            'date' => '2025-09-16',
            'end_date' => '2025-09-17',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'FOMC meeting with Summary of Economic Projections',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting',
            'date' => '2025-11-04',
            'end_date' => '2025-11-05',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Federal Open Market Committee meeting - interest rate decision',
            'source' => 'Federal Reserve'
        ],
        [
            'event' => 'FOMC Meeting + SEP',
            'date' => '2025-12-16',
            'end_date' => '2025-12-17',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'FOMC meeting with Summary of Economic Projections',
            'source' => 'Federal Reserve'
        ]
    ],

    'recurring_events' => [
        // These are estimates based on typical release schedules
        // Actual dates should be confirmed via API when available
        [
            'event' => 'US Non-Farm Payrolls',
            'typical_day' => 'first Friday',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Monthly employment report - market moving data',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US CPI',
            'typical_day' => 'second week',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Consumer Price Index - key inflation indicator',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'ECB Rate Decision',
            'typical_day' => 'every 6 weeks',
            'impact' => 'high',
            'country' => 'EU',
            'description' => 'European Central Bank interest rate decision',
            'source' => 'ECB'
        ],
        [
            'event' => 'US GDP',
            'typical_day' => 'quarterly',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Gross Domestic Product - economic growth indicator',
            'source' => 'Bureau of Economic Analysis'
        ]
    ],

    'crypto_events_2025' => [
        [
            'event' => 'Ethereum Pectra Upgrade',
            'date' => '2025-Q1',
            'impact' => 'high',
            'country' => 'Global',
            'description' => 'Major Ethereum network upgrade',
            'source' => 'Ethereum Foundation'
        ],
        [
            'event' => 'Bitcoin ETF Options Launch',
            'date' => '2025-01-01',
            'impact' => 'medium',
            'country' => 'US',
            'description' => 'Options trading begins for Bitcoin ETFs',
            'source' => 'Market Data'
        ]
    ],

    /*
    |--------------------------------------------------------------------------
    | Impact Levels
    |--------------------------------------------------------------------------
    */
    'impact_levels' => [
        'high' => [
            'color' => '#dc3545',
            'label' => 'High Impact',
            'description' => 'Market-moving events that typically cause significant volatility'
        ],
        'medium' => [
            'color' => '#ffc107',
            'label' => 'Medium Impact',
            'description' => 'Important data that may influence market direction'
        ],
        'low' => [
            'color' => '#28a745',
            'label' => 'Low Impact',
            'description' => 'Routine data with limited market impact'
        ]
    ]
];