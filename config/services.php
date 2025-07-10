<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'alpha_vantage' => [
        'key' => env('ALPHA_VANTAGE_KEY'),
        'base_url' => 'https://www.alphavantage.co/query',
    ],

    'coingecko' => [
        'key' => env('COINGECKO_API_KEY'),
        'base_url' => 'https://api.coingecko.com/api/v3',
    ],

    'finnhub' => [
        'key' => env('FINNHUB_KEY'),
        'base_url' => 'https://finnhub.io/api/v1',
    ],

    'fred' => [
        'key' => env('FRED_API_KEY'),
        'base_url' => 'https://api.stlouisfed.org/fred',
    ],

    'trading_economics' => [
        'key' => env('TRADING_ECONOMICS_KEY'),
        'base_url' => 'https://api.tradingeconomics.com',
    ],

    'cryptocompare' => [
        'key' => env('CRYPTOCOMPARE_KEY'),
        'base_url' => 'https://min-api.cryptocompare.com/data',
    ],

];
