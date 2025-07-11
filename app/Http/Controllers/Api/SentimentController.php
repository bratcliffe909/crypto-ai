<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\SentimentRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SentimentController extends Controller
{
    private SentimentRepository $sentimentRepository;

    public function __construct(SentimentRepository $sentimentRepository)
    {
        $this->sentimentRepository = $sentimentRepository;
    }

    /**
     * Get market sentiment data
     */
    public function marketSentiment(Request $request)
    {
        try {
            $result = $this->sentimentRepository->getMarketSentiment();
            
            // Extract data and metadata for response
            $data = $result['data'] ?? $result;
            $metadata = $result['metadata'] ?? [];
            
            return response()->json($data)
                ->header('X-Cache-Age', $metadata['cacheAge'] ?? 0)
                ->header('X-Data-Source', $metadata['source'] ?? 'unknown')
                ->header('X-Last-Updated', $metadata['lastUpdated'] ?? now()->toIso8601String());
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
            $result = $this->sentimentRepository->getSocialActivityMetrics($days);
            
            // Extract data and metadata for response
            $data = $result['data'] ?? $result;
            $metadata = $result['metadata'] ?? [];
            
            return response()->json($data)
                ->header('X-Cache-Age', $metadata['cacheAge'] ?? 0)
                ->header('X-Data-Source', $metadata['source'] ?? 'unknown')
                ->header('X-Last-Updated', $metadata['lastUpdated'] ?? now()->toIso8601String());
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
            $result = $this->sentimentRepository->getMarketSentimentDirect();
            return response()->json($result);
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
            $result = $this->sentimentRepository->getSocialActivityDirect($days);
            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Social activity update error', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Unable to update social activity data',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}