import React from 'react';
import { Card, ProgressBar, Row, Col, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';
import useApi from '../../hooks/useApi';
import TimeAgo from '../common/TimeAgo';

const MarketBreadth = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/market-metrics/breadth', 120000); // 2 minutes
  
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'Extreme Greed':
        return 'success';
      case 'Greed':
        return 'success opacity-75';
      case 'Neutral':
        return 'warning';
      case 'Fear':
        return 'danger opacity-75';
      case 'Extreme Fear':
        return 'danger';
      default:
        return 'secondary';
    }
  };
  
  const formatPrice = (price) => {
    if (!price || typeof price !== 'number') return '$0';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };
  

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Market Breadth
          </h5>
          {lastFetch && <TimeAgo date={lastFetch} />}
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
            {/* Sentiment Score */}
            <div className="text-center mb-4">
              <h2 className="mb-1">{data.sentimentScore}</h2>
              <Badge bg={getSentimentColor(data.sentiment)} className="px-3 py-2">
                {data.sentiment}
              </Badge>
            </div>
            
            {/* Breadth Bar */}
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-success">
                  <i className="bi bi-arrow-up-circle me-1"></i>
                  {data.breadth.gainers} Gainers
                </span>
                <span className="text-danger">
                  {data.breadth.losers} Losers
                  <i className="bi bi-arrow-down-circle ms-1"></i>
                </span>
              </div>
              <ProgressBar>
                <ProgressBar 
                  variant="success" 
                  now={data.breadth.gainersPercentage} 
                  label={`${data.breadth.gainersPercentage}%`}
                />
                <ProgressBar 
                  variant="danger" 
                  now={data.breadth.losersPercentage} 
                />
              </ProgressBar>
              <small className="text-muted d-block text-center mt-1">
                Out of {data.breadth.total} coins analyzed
              </small>
            </div>
            
            {/* Top Movers */}
            <Row>
              <Col xs={6}>
                <h6 className="text-success mb-2">
                  <i className="bi bi-graph-up me-1"></i>
                  Top Gainers
                </h6>
                <ListGroup variant="flush" className="small">
                  {data.topGainers.map((coin, index) => (
                    <ListGroup.Item key={index} className="px-0 py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">{coin.symbol}</span>
                        <Badge bg="success">
                          +{(coin.change || 0).toFixed(2)}%
                        </Badge>
                      </div>
                      <small className="text-muted">{formatPrice(coin.price)}</small>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Col>
              
              <Col xs={6}>
                <h6 className="text-danger mb-2">
                  <i className="bi bi-graph-down me-1"></i>
                  Top Losers
                </h6>
                <ListGroup variant="flush" className="small">
                  {data.topLosers.map((coin, index) => (
                    <ListGroup.Item key={index} className="px-0 py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">{coin.symbol}</span>
                        <Badge bg="danger">
                          {coin.change.toFixed(2)}%
                        </Badge>
                      </div>
                      <small className="text-muted">{formatPrice(coin.price)}</small>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Col>
            </Row>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default MarketBreadth;