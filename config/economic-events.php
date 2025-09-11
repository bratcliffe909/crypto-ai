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
            'event' => 'US PPI',
            'typical_day' => 'second week',
            'impact' => 'medium',
            'country' => 'US',
            'description' => 'Producer Price Index - wholesale inflation',
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
        ],
        [
            'event' => 'US Retail Sales',
            'typical_day' => 'mid-month',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Consumer spending indicator',
            'source' => 'Census Bureau'
        ],
        [
            'event' => 'Bank of England Rate Decision',
            'typical_day' => '8 times per year',
            'impact' => 'high',
            'country' => 'UK',
            'description' => 'UK interest rate decision',
            'source' => 'Bank of England'
        ],
        [
            'event' => 'US Initial Jobless Claims',
            'typical_day' => 'every Thursday',
            'impact' => 'medium',
            'country' => 'US',
            'description' => 'Weekly unemployment claims',
            'source' => 'Department of Labor'
        ],
        [
            'event' => 'US PCE Inflation',
            'typical_day' => 'end of month',
            'impact' => 'high',
            'country' => 'US',
            'description' => "Fed's preferred inflation measure",
            'source' => 'Bureau of Economic Analysis'
        ]
    ],

    'crypto_events_2025' => [
        [
            'event' => 'Bitcoin Halving Anniversary',
            'date' => '2025-04-19',
            'impact' => 'medium',
            'country' => 'Global',
            'description' => '1 year since 2024 Bitcoin halving - historical price patterns',
            'source' => 'Bitcoin Network'
        ],
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
    
    'major_events_2025' => [
        [
            'event' => 'Jackson Hole Symposium',
            'date' => '2025-08-22',
            'end_date' => '2025-08-24',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Annual central banking conference - major policy signals',
            'source' => 'Federal Reserve Bank of Kansas City'
        ],
        [
            'event' => 'G7 Finance Ministers Meeting',
            'date' => '2025-05-09',
            'end_date' => '2025-05-11',
            'impact' => 'medium',
            'country' => 'Global',
            'description' => 'Global economic policy coordination',
            'source' => 'G7'
        ],
        [
            'event' => 'IMF/World Bank Spring Meetings',
            'date' => '2025-04-14',
            'end_date' => '2025-04-20',
            'impact' => 'medium',
            'country' => 'Global',
            'description' => 'Global economic outlook and policy discussions',
            'source' => 'IMF/World Bank'
        ],
        [
            'event' => 'US Debt Ceiling Deadline',
            'date' => '2025-07-31',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Potential market volatility around debt ceiling negotiations',
            'source' => 'US Treasury'
        ],
        [
            'event' => 'US Non-Farm Payrolls',
            'date' => '2025-09-06',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Monthly employment report - market moving data',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US CPI',
            'date' => '2025-09-11',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Consumer Price Index - key inflation indicator',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US Non-Farm Payrolls',
            'date' => '2025-10-04',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Monthly employment report - market moving data',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US CPI',
            'date' => '2025-10-10',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Consumer Price Index - key inflation indicator',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US PPI',
            'date' => '2025-10-11',
            'impact' => 'medium',
            'country' => 'US',
            'description' => 'Producer Price Index - wholesale inflation',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'ECB Interest Rate Decision',
            'date' => '2025-10-17',
            'impact' => 'high',
            'country' => 'EU',
            'description' => 'European Central Bank interest rate decision',
            'source' => 'ECB'
        ],
        [
            'event' => 'US Retail Sales',
            'date' => '2025-10-16',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Consumer spending indicator',
            'source' => 'Census Bureau'
        ],
        [
            'event' => 'Bank of England Rate Decision',
            'date' => '2025-11-07',
            'impact' => 'high',
            'country' => 'UK',
            'description' => 'UK interest rate decision',
            'source' => 'Bank of England'
        ],
        [
            'event' => 'US Non-Farm Payrolls',
            'date' => '2025-11-01',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Monthly employment report - market moving data',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US CPI',
            'date' => '2025-11-13',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Consumer Price Index - key inflation indicator',
            'source' => 'Bureau of Labor Statistics'
        ],
        [
            'event' => 'US PCE Inflation',
            'date' => '2025-09-27',
            'impact' => 'high',
            'country' => 'US',
            'description' => "Fed's preferred inflation measure",
            'source' => 'Bureau of Economic Analysis'
        ],
        [
            'event' => 'US PCE Inflation',
            'date' => '2025-10-31',
            'impact' => 'high',
            'country' => 'US',
            'description' => "Fed's preferred inflation measure",
            'source' => 'Bureau of Economic Analysis'
        ],
        [
            'event' => 'US GDP (Q3 Advance)',
            'date' => '2025-10-30',
            'impact' => 'high',
            'country' => 'US',
            'description' => 'Gross Domestic Product - economic growth indicator',
            'source' => 'Bureau of Economic Analysis'
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