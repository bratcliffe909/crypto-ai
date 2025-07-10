<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CryptoCompareService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SentimentController extends Controller
{
    private $cryptoCompareService;

    public function __construct(CryptoCompareService $cryptoCompareService)
    {
        $this->cryptoCompareService = $cryptoCompareService;
    }

    /**
     * Get market sentiment data
     */
    public function marketSentiment(Request $request)
    {
        try {
            $data = $this->cryptoCompareService->getMarketSentiment();
            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('Market sentiment error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Unable to fetch market sentiment data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get social activity data
     */
    public function socialActivity(Request $request)
    {
        try {
            $days = $request->input('days', 30);
            $data = $this->cryptoCompareService->getSocialActivity($days);
            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('Social activity error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Unable to fetch social activity data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update market sentiment cache (Direct API)
     */
    public function updateMarketSentiment(Request $request)
    {
        try {
            $data = $this->cryptoCompareService->getMarketSentimentDirect();
            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('Market sentiment update error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Unable to update market sentiment data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update social activity cache (Direct API)
     */
    public function updateSocialActivity(Request $request)
    {
        try {
            $days = $request->input('days', 30);
            $data = $this->cryptoCompareService->getSocialActivityDirect($days);
            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('Social activity update error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Unable to update social activity data',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}