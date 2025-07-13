<?php

namespace App\Repositories;

use App\Services\CacheService;
use App\Services\FinnhubService;
use Illuminate\Support\Facades\Log;

class NewsRepository extends BaseRepository
{
    private FinnhubService $finnhubService;

    public function __construct(
        CacheService $cacheService,
        FinnhubService $finnhubService
    ) {
        parent::__construct($cacheService);
        $this->finnhubService = $finnhubService;
    }

    /**
     * Get the cache prefix for news data
     *
     * @return string
     */
    protected function getCachePrefix(): string
    {
        return 'news';
    }

    /**
     * Get crypto news feed with pagination
     *
     * @param int $page
     * @param int $perPage
     * @return array
     */
    public function getCryptoNewsFeed(int $page = 1, int $perPage = 20): array
    {
        $this->logOperation('getCryptoNewsFeed', ['page' => $page, 'perPage' => $perPage]);
        
        $cacheKey = "crypto_news_feed_{$page}_{$perPage}";
        
        $result = $this->cacheService->rememberWithoutFreshness($cacheKey, function () use ($page, $perPage) {
            return $this->fetchAndProcessNewsFeed($page, $perPage);
        });
        
        // Extract data from wrapped response
        return $result['data'] ?? $result;
    }
    
    /**
     * Get crypto news feed directly from API (for cache updates)
     */
    public function getCryptoNewsFeedDirect(int $page = 1, int $perPage = 20): array
    {
        $result = $this->fetchAndProcessNewsFeed($page, $perPage);
        
        // Cache the result using storeWithMetadata
        $cacheKey = "crypto_news_feed_{$page}_{$perPage}";
        $this->cacheService->storeWithMetadata($cacheKey, $result);
        
        return [
            'data' => $result,
            'metadata' => [
                'lastUpdated' => now()->toIso8601String(),
                'cacheAge' => 0,
                'source' => 'primary',
                'isFresh' => true
            ]
        ];
    }
    
    /**
     * Fetch and process news feed from external sources
     */
    private function fetchAndProcessNewsFeed(int $page, int $perPage): array
    {
        try {
            // Calculate pagination offset
            $offset = ($page - 1) * $perPage;
            
            // Get news from Finnhub
            $finnhubResult = $this->finnhubService->getMarketNews('crypto');
            
            // Handle the cache service response format
            $finnhubNews = $finnhubResult['data'] ?? [];
            
            // Normalize the news format
            $normalizedNews = $this->normalizeNewsFormat($finnhubNews);
            
            // Sort by published date (newest first)
            $sortedNews = $this->sortNewsByDate($normalizedNews);
            
            // Apply pagination
            $totalArticles = count($sortedNews);
            $paginatedNews = array_slice($sortedNews, $offset, $perPage);
            
            return [
                'articles' => $paginatedNews,
                'count' => count($paginatedNews),
                'total' => $totalArticles,
                'page' => $page,
                'per_page' => $perPage,
                'has_more' => ($offset + $perPage) < $totalArticles,
                'lastUpdated' => now()->toIso8601String()
            ];
            
        } catch (\Exception $e) {
            Log::error('News feed fetch error', [
                'error' => $e->getMessage(),
                'page' => $page,
                'perPage' => $perPage
            ]);
            
            // Return empty result on error
            return [
                'articles' => [],
                'count' => 0,
                'total' => 0,
                'page' => $page,
                'per_page' => $perPage,
                'has_more' => false,
                'lastUpdated' => now()->toIso8601String(),
                'error' => 'Failed to fetch news feed'
            ];
        }
    }
    
    /**
     * Normalize news format from different sources
     */
    private function normalizeNewsFormat(array $newsData): array
    {
        return array_map(function($article) {
            return [
                'title' => $article['headline'] ?? '',
                'summary' => $article['summary'] ?? '',
                'url' => $article['url'] ?? '',
                'source' => $article['source'] ?? 'Unknown',
                'publishedAt' => isset($article['datetime']) 
                    ? date('Y-m-d H:i:s', $article['datetime']) 
                    : now()->toDateTimeString(),
                'image' => $article['image'] ?? null,
                'category' => $article['category'] ?? 'crypto'
            ];
        }, $newsData);
    }
    
    /**
     * Sort news by published date
     */
    private function sortNewsByDate(array $news): array
    {
        usort($news, function ($a, $b) {
            $aTime = strtotime($a['publishedAt']);
            $bTime = strtotime($b['publishedAt']);
            return $bTime - $aTime;
        });
        
        return $news;
    }

    /**
     * Search news by keyword
     */
    public function searchNews(string $keyword, int $page = 1, int $perPage = 20): array
    {
        $cacheKey = "crypto_news_search_" . md5($keyword) . "_{$page}_{$perPage}";
        
        $result = $this->cacheService->rememberWithoutFreshness($cacheKey, function () use ($keyword, $page, $perPage) {
            // Get all news first
            $allNewsResult = $this->fetchAndProcessNewsFeed(1, 100);
            
            if (empty($allNewsResult['articles'])) {
                return $allNewsResult;
            }
            
            // Search in title and summary
            $searchResults = array_filter($allNewsResult['articles'], function($article) use ($keyword) {
                $searchIn = strtolower($article['title'] . ' ' . $article['summary']);
                return stripos($searchIn, $keyword) !== false;
            });
            
            // Re-index array
            $searchResults = array_values($searchResults);
            
            // Apply pagination
            $offset = ($page - 1) * $perPage;
            $totalArticles = count($searchResults);
            $paginatedNews = array_slice($searchResults, $offset, $perPage);
            
            return [
                'articles' => $paginatedNews,
                'count' => count($paginatedNews),
                'total' => $totalArticles,
                'page' => $page,
                'per_page' => $perPage,
                'has_more' => ($offset + $perPage) < $totalArticles,
                'keyword' => $keyword,
                'lastUpdated' => now()->toIso8601String()
            ];
        });
        
        // Extract data from wrapped response
        return $result['data'] ?? $result;
    }

    /**
     * Filter news by category
     */
    public function filterNewsByCategory(string $category, int $page = 1, int $perPage = 20): array
    {
        $cacheKey = "crypto_news_category_{$category}_{$page}_{$perPage}";
        
        $result = $this->cacheService->rememberWithoutFreshness($cacheKey, function () use ($category, $page, $perPage) {
            // Get all news first
            $allNewsResult = $this->fetchAndProcessNewsFeed(1, 100); // Get more articles for filtering
            
            if (empty($allNewsResult['articles'])) {
                return $allNewsResult;
            }
            
            // Filter by category
            $filteredNews = array_filter($allNewsResult['articles'], function($article) use ($category) {
                return stripos($article['category'], $category) !== false;
            });
            
            // Re-index array
            $filteredNews = array_values($filteredNews);
            
            // Apply pagination
            $offset = ($page - 1) * $perPage;
            $totalArticles = count($filteredNews);
            $paginatedNews = array_slice($filteredNews, $offset, $perPage);
            
            return [
                'articles' => $paginatedNews,
                'count' => count($paginatedNews),
                'total' => $totalArticles,
                'page' => $page,
                'per_page' => $perPage,
                'has_more' => ($offset + $perPage) < $totalArticles,
                'category' => $category,
                'lastUpdated' => now()->toIso8601String()
            ];
        });
        
        // Extract data from wrapped response
        return $result['data'] ?? $result;
    }

    /**
     * Validate news data
     *
     * @param mixed $data
     * @return bool
     */
    public function validate($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        // Validate news feed format
        if (isset($data['articles']) && is_array($data['articles'])) {
            return true;
        }

        // Validate individual article
        if (isset($data['title']) && isset($data['url'])) {
            return true;
        }

        return false;
    }

    /**
     * Group news by category
     *
     * @param array $articles
     * @return array
     */
    public function groupNewsByCategory(array $articles): array
    {
        $grouped = [
            'market' => [],
            'regulatory' => [],
            'technology' => [],
            'general' => []
        ];
        
        // Placeholder for Phase 2 implementation
        foreach ($articles as $article) {
            $grouped['general'][] = $article;
        }
        
        return $grouped;
    }
}