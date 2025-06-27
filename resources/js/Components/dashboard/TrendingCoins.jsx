import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { BsExclamationTriangle, BsFire, BsClock } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';

const TrendingCoins = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/trending');

  const trendingCoins = data?.coins || [];

  // Format time ago
  const getTimeAgo = (date) => {
    if (!date) return '';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 minute ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    
    return 'over a day ago';
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Trending</h5>
          <BsFire className="ms-2 text-warning" />
        </div>
        <div className="d-flex align-items-center gap-2">
          {lastFetch && (
            <small className="text-muted d-flex align-items-center">
              <BsClock size={12} className="me-1" />
              {getTimeAgo(lastFetch)}
            </small>
          )}
          {error && (
            <BsExclamationTriangle className="text-warning" title="Failed to update" />
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {loading && !data ? (
          <div className="p-3">
            <LoadingSpinner />
          </div>
        ) : trendingCoins.length > 0 ? (
          <ListGroup variant="flush">
            {trendingCoins.slice(0, 7).map((coin, index) => (
              <ListGroup.Item key={coin.item.id} className="d-flex align-items-center">
                <Badge bg="secondary" className="me-2">{index + 1}</Badge>
                <img 
                  src={coin.item.thumb} 
                  alt={coin.item.name}
                  width="20"
                  height="20"
                  className="me-2"
                />
                <div className="flex-grow-1">
                  <a 
                    href={`https://www.coingecko.com/en/coins/${coin.item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none text-body"
                  >
                    <div className="fw-medium">{coin.item.name}</div>
                    <small className="text-muted">{coin.item.symbol}</small>
                  </a>
                </div>
                <div className="text-end">
                  {coin.item.data?.price_change_percentage_24h?.usd !== undefined && (
                    <div className={`small ${coin.item.data.price_change_percentage_24h.usd >= 0 ? 'text-success' : 'text-danger'}`}>
                      {coin.item.data.price_change_percentage_24h.usd >= 0 ? '+' : ''}{coin.item.data.price_change_percentage_24h.usd.toFixed(2)}%
                    </div>
                  )}
                  <Badge bg="primary" pill>
                    #{coin.item.market_cap_rank || 'N/A'}
                  </Badge>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <p className="text-muted text-center p-3 mb-0">
            No trending coins available
          </p>
        )}
      </Card.Body>
    </Card>
  );
};

export default TrendingCoins;
