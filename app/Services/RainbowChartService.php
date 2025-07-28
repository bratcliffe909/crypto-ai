<?php

namespace App\Services;

use App\Repositories\IndicatorRepository;

class RainbowChartService
{
    private IndicatorRepository $indicatorRepository;

    public function __construct(IndicatorRepository $indicatorRepository)
    {
        $this->indicatorRepository = $indicatorRepository;
    }

    /**
     * Get rainbow chart data with calculated bands
     * @deprecated Use IndicatorRepository::getRainbowChartData() instead
     */
    public function getRainbowChartData($days = 'max')
    {
        return $this->indicatorRepository->getRainbowChartData($days);
    }
    
    /**
     * Get current rainbow chart status
     * @deprecated Use IndicatorRepository::getRainbowChartStatus() instead
     */
    public function getCurrentStatus()
    {
        return $this->indicatorRepository->getRainbowChartStatus();
    }
    
    /**
     * Get rainbow chart data directly from API (bypasses cache for updates)
     */
    public function getRainbowChartDataDirect($days = 'max')
    {
        return $this->indicatorRepository->getRainbowChartDataDirect($days);
    }
}