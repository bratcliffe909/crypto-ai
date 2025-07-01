import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { BsClock, BsBoxArrowUpRight } from 'react-icons/bs';
import LoadingSpinner from '../../common/LoadingSpinner';
import { getTimeAgo } from '../../../utils/timeUtils';

const MobileNewsFeed = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const observer = useRef();
  const lastArticleRef = useRef();

  // Fetch news articles
  const fetchNews = useCallback(async (pageNum, isRefresh = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/crypto/news-feed', {
        params: { 
          page: pageNum, 
          per_page: 10 
        }
      });
      
      const newArticles = response.data.articles || [];
      
      if (isRefresh) {
        setArticles(newArticles);
      } else {
        setArticles(prev => pageNum === 1 ? newArticles : [...prev, ...newArticles]);
      }
      
      setHasMore(response.data.has_more);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError('Failed to load news articles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  // Initial load
  useEffect(() => {
    fetchNews(1);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchNews(page + 1);
      }
    });

    if (lastArticleRef.current) {
      observer.current.observe(lastArticleRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, page, fetchNews]);

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchNews(1, true);
  }, [fetchNews]);

  const openArticle = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mobile-news-feed">
      <div className="news-header">
        <h5 className="mb-0">Crypto News</h5>
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '⟳' : '↻'}
        </button>
      </div>

      <div className="news-list">
        {articles.map((article, index) => {
          const isLastArticle = articles.length === index + 1;
          
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
        
        {loading && (
          <div className="loading-more">
            <LoadingSpinner size="sm" />
            <span>Loading more articles...</span>
          </div>
        )}
        
        {error && (
          <div className="text-center text-danger p-3">
            <p className="mb-0">{error}</p>
          </div>
        )}
        
        {!hasMore && articles.length > 0 && (
          <div className="text-center text-muted p-3">
            <small>No more articles</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNewsFeed;