<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\AlternativeService;

class IndicatorController extends Controller
{
    private AlternativeService $alternativeService;
    
    public function __construct(AlternativeService $alternativeService)
    {
        $this->alternativeService = $alternativeService;
    }
    
    /**
     * Get Fear and Greed Index data
     */
    public function fearGreed(Request $request)
    {
        $limit = $request->get('limit', 30);
        $format = $request->get('format', 'json');
        $dateFormat = $request->get('date_format', 'world');
        
        try {
            $data = $this->alternativeService->getFearGreedIndex($limit, $format, $dateFormat);
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}