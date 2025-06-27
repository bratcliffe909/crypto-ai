import React from 'react';
import { Card, ProgressBar, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import useApi from '../../hooks/useApi';

const VolatilityMeter = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/market-metrics/volatility', 180000); // 3 minutes
  
  const getVolatilityColor = (volatility) => {
    if (volatility >= 10) return 'danger';
    if (volatility >= 7) return 'warning';
    if (volatility >= 4) return 'info';
    return 'success';
  };
  
  const getVolatilityLabel = (volatility) => {
    if (volatility >= 10) return 'Extreme';
    if (volatility >= 7) return 'High';
    if (volatility >= 4) return 'Moderate';
    return 'Low';
  };
  
  const formatPrice = (price) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };
  
  const timeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Volatility Meter
          </h5>
          {lastFetch && (
            <small className="text-muted">Updated {timeSince(lastFetch)}</small>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        )}
        
        {error && (
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {data && !loading && !error && (
          <>
            {/* Average Volatility */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Market Volatility</span>
                <Badge bg={getVolatilityColor(data.averageVolatility)}>
                  {getVolatilityLabel(data.averageVolatility)}
                </Badge>
              </div>
              <ProgressBar 
                now={Math.min(data.averageVolatility * 5, 100)} 
                variant={getVolatilityColor(data.averageVolatility)}
                label={`${data.averageVolatility}%`}
              />
              <small className="text-muted">
                Average 24h volatility across top 10 coins
              </small>
            </div>
            
            {/* Individual Coin Volatility */}
            <h6 className="mb-3">Top 10 Coins Volatility</h6>
            <ListGroup variant="flush">
              {data.coins.map((coin, index) => (
                <ListGroup.Item key={index} className="px-0 py-2">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div>
                      <strong>{coin.symbol}</strong>
                      <small className="text-muted ms-2">{coin.name}</small>
                    </div>
                    <Badge 
                      bg={getVolatilityColor(coin.volatility)}
                      className="ms-2"
                    >
                      {coin.volatility}%
                    </Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {formatPrice(coin.price)}
                      <Badge 
                        bg={coin.change24h >= 0 ? 'success' : 'danger'} 
                        className="ms-2"
                      >
                        {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                      </Badge>
                    </small>
                    <small className="text-muted">
                      H: {formatPrice(coin.high24h)} / L: {formatPrice(coin.low24h)}
                    </small>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default VolatilityMeter;