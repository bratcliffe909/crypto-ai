import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { BsClock, BsBoxArrowUpRight, BsNewspaper } from 'react-icons/bs';
import LoadingSpinner from '../../common/LoadingSpinner';
import MobileSectionHeader from '../common/MobileSectionHeader';
import { getTimeAgo } from '../../../utils/timeUtils';
import useApi from '../../../hooks/useApi';

const MobileNewsFeed = () => {
  // Use same data source as desktop for initial load (ensures data consistency)
  const { data: initialData, loading: initialLoading, error: initialError, lastFetch } = useApi('/api/crypto/news-feed', 600000);
  
  // State for infinite scroll additional pages
  const [additionalArticles, setAdditionalArticles] = useState([]);
  const [currentPage, setCurrentPage] = useState(2); // Start from page 2 since page 1 comes from useApi
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const observer = useRef();
  const lastArticleRef = useRef();

  // Combine initial data from useApi with additional paginated articles
  const allArticles = useMemo(() => {
    const initial = initialData?.articles || [];
    const combined = [...initial, ...additionalArticles];
    
    // Deduplicate by URL to handle potential overlaps
    const seen = new Set();
    return combined.filter(article => {
      if (seen.has(article.url)) {
        return false;
      }
      seen.add(article.url);
      return true;
    });
  }, [initialData, additionalArticles]);

  // Reset additional articles when initial data updates (new cache data)
  useEffect(() => {
    if (initialData?.articles) {
      setAdditionalArticles([]);
      setCurrentPage(2);
      setHasMore(initialData.has_more !== false); // Default to true if not specified
    }
  }, [initialData]);

  // Fetch additional pages for infinite scroll (beyond initial data from useApi)
  const fetchMoreArticles = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    try {
      const response = await axios.get('/api/crypto/news-feed', {
        params: { 
          page: currentPage, 
          per_page: 10 
        }
      });
      
      const newArticles = response.data.articles || [];
      
      if (newArticles.length > 0) {
        setAdditionalArticles(prev => [...prev, ...newArticles]);
        setCurrentPage(prev => prev + 1);
      }
      
      setHasMore(response.data.has_more !== false && newArticles.length > 0);
      
    } catch (err) {
      console.error('Failed to fetch more news:', err);
      // Don't show error for additional pages, just stop loading more
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, loadingMore, hasMore]);

  // Infinite scroll observer for additional pages
  useEffect(() => {
    if (loadingMore || initialLoading) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading) {
        fetchMoreArticles();
      }
    });

    if (lastArticleRef.current) {
      observer.current.observe(lastArticleRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loadingMore, initialLoading, hasMore, fetchMoreArticles]);

  // Pull to refresh handler - resets everything and triggers useApi refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset additional articles and pagination
    setAdditionalArticles([]);
    setCurrentPage(2);
    setHasMore(true);
    
    // The useApi hook will handle refreshing the initial data
    // We'll end refreshing state when new data arrives
    setTimeout(() => setRefreshing(false), 1000); // Give time for useApi to refresh
  }, []);

  const openArticle = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mobile-news-feed">
      <MobileSectionHeader
        title="News"
        icon={BsNewspaper}
        lastUpdated={lastFetch}
        error={initialError}
      >
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '⟳' : '↻'}
        </button>
      </MobileSectionHeader>

      <div className="news-list">
        {/* Show initial loading state */}
        {initialLoading && allArticles.length === 0 && (
          <div className="loading-initial">
            <LoadingSpinner size="sm" />
            <span>Loading news...</span>
          </div>
        )}

        {/* Show articles */}
        {allArticles.map((article, index) => {
          const isLastArticle = allArticles.length === index + 1;
          
          return (
            <div
              key={`${article.url}-${index}`}
              ref={isLastArticle ? lastArticleRef : null}
              className="news-item"
              onClick={() => openArticle(article.url)}
            >
              {article.image && (
                <img 
                  src={article.image} 
                  alt="" 
                  className="news-image"
                  loading="lazy"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              
              <div className="news-content">
                <h6 className="news-title">{article.title}</h6>
                
                <div className="news-meta">
                  <span className="news-source">{article.source}</span>
                  <span className="news-time">
                    <BsClock size={12} className="me-1" />
                    {getTimeAgo(article.publishedAt)}
                  </span>
                </div>
                
                {article.summary && (
                  <p className="news-summary">{article.summary}</p>
                )}
              </div>
              
              <BsBoxArrowUpRight className="news-link-icon" size={16} />
            </div>
          );
        })}
        
        {/* Show loading more state */}
        {loadingMore && (
          <div className="loading-more">
            <LoadingSpinner size="sm" />
            <span>Loading more articles...</span>
          </div>
        )}
        
        {/* Show initial error state */}
        {initialError && allArticles.length === 0 && (
          <div className="text-center text-danger p-3">
            <p className="mb-0">{initialError}</p>
          </div>
        )}
        
        {/* Show end of list message */}
        {!hasMore && allArticles.length > 0 && !loadingMore && (
          <div className="text-center text-muted p-3">
            <small>No more articles</small>
          </div>
        )}

        {/* Show empty state */}
        {!initialLoading && !initialError && allArticles.length === 0 && (
          <div className="text-center text-muted p-3">
            <BsNewspaper size={24} className="mb-2" />
            <p>No news articles available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNewsFeed;