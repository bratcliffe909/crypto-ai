import React from 'react';
import { Card, ListGroup, Badge, Spinner, Alert, Image } from 'react-bootstrap';
import useApi from '../../hooks/useApi';
import TimeAgo from '../common/TimeAgo';

const NewsFeed = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/news-feed', 600000); // 10 minutes
  
  const getSentimentBadge = (sentiment) => {
    const sentimentLower = sentiment?.toLowerCase() || 'neutral';
    switch (sentimentLower) {
      case 'bullish':
      case 'positive':
        return <Badge bg="success" className="ms-2">Bullish</Badge>;
      case 'bearish':
      case 'negative':
        return <Badge bg="danger" className="ms-2">Bearish</Badge>;
      case 'somewhat-bullish':
        return <Badge bg="success" className="ms-2 opacity-75">Bullish</Badge>;
      case 'somewhat-bearish':
        return <Badge bg="danger" className="ms-2 opacity-75">Bearish</Badge>;
      default:
        return <Badge bg="secondary" className="ms-2">Neutral</Badge>;
    }
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const truncateText = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };
  
  const getDomainFromUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };
  

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-newspaper me-2"></i>
            News Feed
          </h5>
          {lastFetch && <TimeAgo date={lastFetch} />}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading news...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="danger" className="m-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {data && !loading && !error && (
          <>
            {data.articles && data.articles.length > 0 ? (
              <ListGroup variant="flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {data.articles.map((article, index) => (
                  <ListGroup.Item 
                    key={index} 
                    className="border-0 border-bottom"
                    action
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="d-flex">
                      {article.image || article.banner ? (
                        <div className="me-3 flex-shrink-0">
                          <Image 
                            src={article.image || article.banner} 
                            alt={article.title}
                            style={{ width: '80px', height: '60px', objectFit: 'cover' }}
                            rounded
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : null}
                      
                      <div className="flex-grow-1">
                        <h6 className="mb-1 lh-sm">
                          {article.title}
                          {article.sentiment && getSentimentBadge(article.sentiment)}
                        </h6>
                        
                        {article.summary && (
                          <p className="text-muted small mb-2">
                            {truncateText(article.summary)}
                          </p>
                        )}
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <span className="me-2">
                              <i className="bi bi-globe2 me-1"></i>
                              {article.source || getDomainFromUrl(article.url)}
                            </span>
                            <span>
                              <i className="bi bi-clock me-1"></i>
                              {formatTime(article.publishedAt)}
                            </span>
                          </small>
                          
                          {article.related && (
                            <small className="text-muted">
                              {article.related.split(',').slice(0, 2).map((ticker, i) => (
                                <Badge key={i} bg="light" text="dark" className="me-1">
                                  {ticker.trim()}
                                </Badge>
                              ))}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="text-center text-muted py-5">
                <i className="bi bi-newspaper me-2"></i>
                No news available
              </div>
            )}
            
            {data.articles && data.articles.length > 0 && (
              <Card.Footer className="text-center py-2">
                <small className="text-muted">
                  Showing {data.articles.length} latest articles
                </small>
              </Card.Footer>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default NewsFeed;