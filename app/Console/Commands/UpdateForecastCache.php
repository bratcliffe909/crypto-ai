<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
// use App\Services\TradFiCorrelationService;
// use App\Services\MarketRegimeService;
// use App\Services\VolatilityForecastService;
use Illuminate\Support\Facades\Log;

class UpdateForecastCache extends Command
{
    protected $signature = 'cache:update-forecast {--force : Force update even if cache is fresh}';
    protected $description = 'Update Redis cache for TradFi correlations, market regime analysis, and volatility forecasts';

    protected $tradFiService;
    protected $regimeService;
    protected $volatilityService;

    public function __construct(
        // TradFiCorrelationService $tradFiService,
        // MarketRegimeService $regimeService,
        // VolatilityForecastService $volatilityService
    )
    {
        parent::__construct();
        // $this->tradFiService = $tradFiService;
        // $this->regimeService = $regimeService;
        // $this->volatilityService = $volatilityService;
    }

    public function handle()
    {
        $this->info('Starting forecast cache update...');
        
        $startTime = microtime(true);
        $results = [
            'correlations' => ['status' => 'pending', 'details' => null, 'error' => null],
            'regime' => ['status' => 'pending', 'details' => null, 'error' => null],
            'volatility' => ['status' => 'pending', 'details' => null, 'error' => null]
        ];
        
        // Update TradFi Correlations
        try {
            $this->info('Updating TradFi correlation matrix...');
            $correlationData = $this->tradFiService->getMultiAssetMatrix();
            
            if ($correlationData && isset($correlationData['vix_btc'])) {
                $vixCorr = round($correlationData['vix_btc'] * 100);
                $dxyCorr = round($correlationData['dxy_btc'] * 100);
                $spyCorr = round($correlationData['spy_btc'] * 100);
                $confidence = round(($correlationData['confidence'] ?? 0) * 100);
                
                $results['correlations']['status'] = 'success';
                $results['correlations']['details'] = "VIX: {$vixCorr}%, DXY: {$dxyCorr}%, SPY: {$spyCorr}%, Conf: {$confidence}%";
                $this->info("✓ TradFi correlations updated - VIX: {$vixCorr}%, DXY: {$dxyCorr}%, SPY: {$spyCorr}%");
            } else {
                $results['correlations']['status'] = 'empty';
                $this->warn('⚠ TradFi correlations returned empty data');
            }
        } catch (\Exception $e) {
            $results['correlations']['status'] = 'failed';
            $results['correlations']['error'] = $e->getMessage();
            $this->error('✗ Failed to update TradFi correlations: ' . $e->getMessage());
            Log::error('TradFi correlation cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update Market Regime Analysis
        try {
            $this->info('Updating market regime analysis...');
            $regimeData = $this->regimeService->getCurrentMarketRegime();
            
            if ($regimeData && isset($regimeData['regime'])) {
                $regime = strtoupper(str_replace('_', ' ', $regimeData['regime']));
                $riskLevel = strtoupper(str_replace('_', ' ', $regimeData['risk_level'] ?? 'UNKNOWN'));
                $confidence = round(($regimeData['confidence'] ?? 0) * 100);
                
                $results['regime']['status'] = 'success';
                $results['regime']['details'] = "Regime: {$regime}, Risk: {$riskLevel}, Conf: {$confidence}%";
                $this->info("✓ Market regime updated - {$regime} (Risk: {$riskLevel}, Confidence: {$confidence}%)");
            } else {
                $results['regime']['status'] = 'empty';
                $this->warn('⚠ Market regime analysis returned empty data');
            }
        } catch (\Exception $e) {
            $results['regime']['status'] = 'failed';
            $results['regime']['error'] = $e->getMessage();
            $this->error('✗ Failed to update market regime: ' . $e->getMessage());
            Log::error('Market regime cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        // Update Volatility Forecasts
        try {
            $this->info('Updating volatility forecasts...');
            $volatilityData = $this->volatilityService->getVolatilityForecast();
            
            if ($volatilityData && isset($volatilityData['forecast_24h'])) {
                $vol24h = round(($volatilityData['forecast_24h']['expected'] ?? 0) * 100, 1);
                $vol7d = round(($volatilityData['forecast_7d']['expected'] ?? 0) * 100, 1);
                $level24h = strtoupper(str_replace('_', ' ', $volatilityData['forecast_24h']['level'] ?? 'UNKNOWN'));
                
                $results['volatility']['status'] = 'success';
                $results['volatility']['details'] = "24h: {$vol24h}% ({$level24h}), 7d: {$vol7d}%";
                $this->info("✓ Volatility forecasts updated - 24h: {$vol24h}% ({$level24h}), 7d: {$vol7d}%");
            } else {
                $results['volatility']['status'] = 'empty';
                $this->warn('⚠ Volatility forecasts returned empty data');
            }
        } catch (\Exception $e) {
            $results['volatility']['status'] = 'failed';
            $results['volatility']['error'] = $e->getMessage();
            $this->error('✗ Failed to update volatility forecasts: ' . $e->getMessage());
            Log::error('Volatility forecast cache update failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        $duration = round(microtime(true) - $startTime, 2);
        
        // Display summary
        $this->info("\n" . 'Forecast cache update completed in ' . $duration . ' seconds');
        $this->table(
            ['Service', 'Status', 'Details', 'Error'],
            [
                ['TradFi Correlations', $results['correlations']['status'], $results['correlations']['details'] ?? '-', $results['correlations']['error'] ?? '-'],
                ['Market Regime', $results['regime']['status'], $results['regime']['details'] ?? '-', $results['regime']['error'] ?? '-'],
                ['Volatility Forecast', $results['volatility']['status'], $results['volatility']['details'] ?? '-', $results['volatility']['error'] ?? '-'],
            ]
        );
        
        // Log summary
        Log::info('Forecast cache update completed', [
            'duration' => $duration,
            'results' => $results
        ]);
        
        // Return success if at least one service updated successfully
        return ($results['correlations']['status'] === 'success' || 
                $results['regime']['status'] === 'success' || 
                $results['volatility']['status'] === 'success') 
            ? Command::SUCCESS 
            : Command::FAILURE;
    }
}